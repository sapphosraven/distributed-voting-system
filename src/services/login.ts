export const singin = async (payload: any) => {
  const res = await fetch('http://localhost:8000/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  // const res = {
  //   access_token: 'verynicetoken',
  //   type: 'Bearer',
  // };
  return res;
};
