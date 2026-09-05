import http from "./http";

const GQL_URL = import.meta.env.VITE_API_BASE + "/graphql";

export async function gql(query, variables = {}) {
  const { data } = await http.post(GQL_URL, { query, variables });
  if (data.errors?.length) throw new Error(data.errors[0].message);
  return data.data;
}
