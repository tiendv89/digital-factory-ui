type TimerHandle = ReturnType<typeof setTimeout>;

type SingleDoubleClickControllerOptions = {
  delayMs?: number;
  onSingleClick: () => void;
  onDoubleClick: () => void;
};

export type SingleDoubleClickController = {
  handleClick: () => void;
  handleDoubleClick: () => void;
  clearPendingClick: () => void;
};

export function createSingleDoubleClickController({ delayMs = 180, onSingleClick, onDoubleClick }: SingleDoubleClickControllerOptions): SingleDoubleClickController {
  let pendingClick: TimerHandle | null = null;

  function clearPendingClick() {
    if (pendingClick) {
      clearTimeout(pendingClick);
      pendingClick = null;
    }
  }

  return {
    handleClick() {
      clearPendingClick();
      pendingClick = setTimeout(() => {
        pendingClick = null;
        onSingleClick();
      }, delayMs);
    },
    handleDoubleClick() {
      clearPendingClick();
      onDoubleClick();
    },
    clearPendingClick,
  };
}
