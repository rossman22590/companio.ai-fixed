import React from 'react'
import {
  UserButton,
} from "@clerk/nextjs";

const rootPage = () => {
  return (
    <div>
      <UserButton afterSignOutUrl='/' />
    </div>
  )
}

export default rootPage;