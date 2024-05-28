import { currentUser } from "@clerk/nextjs/server";
import { StreamingTextResponse, LangChainStream } from "ai";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { ChatOpenAI } from "@langchain/openai";

import { MemoryManager } from "@/lib/memory";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

import prismadb from "@/lib/prismadb";

export async function POST(
  req: Request,
  { params }: { params: { chatId: string } }
) {
  try {
    const { prompt } = await req.json();
    const user = await currentUser();
    if (!user || !user.firstName || !user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const identifier = req.url + "-" + user.id;

    const { success } = await rateLimit(identifier);

    if (!success) {
      return new NextResponse("Rate limit exceeded", { status: 429 });
    }

    const companion = await prismadb.companion.update({
      where: {
        id: params.chatId,
      },
      data: {
        messages: {
          create: {
            content: prompt,
            role: "user",
            userId: user.id,
          },
        },
      },
    });

    if (!companion) {
      return new NextResponse("Companion not found", { status: 404 });
    }

    const name = companion.id;
    const companion_file_name = name + ".txt";

    const companionKey = {
      companionName: name!,
      userId: user.id,
      modelName: "gpt-4o",
    };

    const memoryManager = await MemoryManager.getInstance();

    const records = await memoryManager.readLatestHistory(companionKey);

    if (records.length === 0) {
      await memoryManager.seedChatHistory(companion.seed, "\n\n", companionKey);
    }

    await memoryManager.writeToHistory("User: " + prompt + "\n", companionKey);

    const recentChatHistory = await memoryManager.readLatestHistory(
      companionKey
    );

    const similarDocs = await memoryManager.vectorSearch(
      recentChatHistory,
      companion_file_name
    );

    let relevantHistory = "";
    if (!!similarDocs && similarDocs.length !== 0) {
      relevantHistory = similarDocs
        .map((doc: any) => doc.pageContent)
        .join("\n");
    }

    const { handlers } = LangChainStream();

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o",
      callbackManager: CallbackManager.fromHandlers(handlers),
      verbose: true,
    });

    const resp = await model
      .invoke(
        `
          ONLY generate plain sentences without prefix of who is speaking. DO NOT use ${companion.name}: prefix. 
  
          ${companion.instructions}
  
          Below are relevant details about ${companion.name}'s past and the conversation you are in.
          ${relevantHistory}
  
          ${recentChatHistory}\n${companion.name}:`
      )
      .catch(console.error);

    const content = resp?.content as string;

    if (!content && content?.length < 1) {
      return new NextResponse("content not found", { status: 404 });
    }

    var Readable = require("stream").Readable;
    let s = new Readable();
    s.push(content);
    s.push(null);

    memoryManager.writeToHistory("" + content, companionKey);

    await prismadb.companion.update({
      where: {
        id: params.chatId,
      },
      data: {
        messages: {
          create: {
            content: content,
            role: "system",
            userId: user.id,
          },
        },
      },
    });

    return new StreamingTextResponse(s);
  } catch (error) {
    console.log("CHAT POST", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
