export type RequestSequence = {
  next: () => number;
  isCurrent: (requestId: number) => boolean;
};

export function createRequestSequence(): RequestSequence {
  let currentRequestId = 0;

  return {
    next() {
      currentRequestId += 1;
      return currentRequestId;
    },
    isCurrent(requestId: number) {
      return requestId === currentRequestId;
    },
  };
}
