import { Alert, AlertDescription } from "@/components/ui/alert";

export function WarningBanner({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        <ul className="list-disc space-y-1 pl-5">
          {messages.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
