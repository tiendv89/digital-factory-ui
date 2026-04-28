import { WorkspaceSwitcher } from "./workspace-switcher";

interface HeaderProps {
  title?: string;
  workspaceIds: string[];
}

export function Header({ title, workspaceIds }: HeaderProps) {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-8"
    >
      <div className="flex flex-col justify-center">
        {title && (
          <h1 className="text-base font-semibold text-text-primary">
            {title}
          </h1>
        )}
      </div>
      <WorkspaceSwitcher workspaceIds={workspaceIds} />
    </header>
  );
}
