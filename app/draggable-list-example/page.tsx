import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import DraggableListDemo from "@/components/draggable-list-demo"

export default async function DraggableListExamplePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Draggable List Component</h1>
      <DraggableListDemo />
    </div>
  )
}
