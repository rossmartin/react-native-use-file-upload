export const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

export const allSettled = (promises: Promise<any>[]) => {
  return Promise.all(
    promises.map((promise) =>
      promise
        .then((value) => ({ status: 'fulfilled', value }))
        .catch((reason) => ({ status: 'rejected', reason }))
    )
  );
};
