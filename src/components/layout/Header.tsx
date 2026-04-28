import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface HeaderProps {
  title?: string;
  workspaceIds: string[];
}

export function Header({ title, workspaceIds }: HeaderProps) {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-8"
    >
      <div className="flex flex-col justify-center">
        {title && (
          <h1 className="text-base font-semibold text-(--color-text-primary)">
            {title}
          </h1>
        )}
        <p className="text-xs text-(--color-text-muted)">
          Feature Status Dashboard
        </p>
      </div>
      <WorkspaceSwitcher workspaceIds={workspaceIds} />
    </header>
  );
}
