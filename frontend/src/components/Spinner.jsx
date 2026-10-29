export default function Spinner({ full }) {
  if (full) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  return <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
}
