import { Inbox } from 'lucide-react'
export default function EmptyState({ text = 'Nenhum registro encontrado.' }: { text?: string }) {
  return <div className="empty"><Inbox size={34}/><p>{text}</p></div>
}
