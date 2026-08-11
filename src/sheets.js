export async function fetchSheetRows({ webAppUrl, secret, fetchFn = fetch }) {
  const postResp = await fetchFn(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, action: 'read_rows' }),
    redirect: 'manual',
  });

  const location = postResp.headers.get('location');
  if (!location) {
    throw new Error(`Sheets webapp did not redirect (status ${postResp.status})`);
  }

  const dataResp = await fetchFn(location);
  if (!dataResp.ok) {
    throw new Error(`Sheets webapp data fetch failed: ${dataResp.status}`);
  }

  const data = await dataResp.json();
  if (!data.ok) {
    throw new Error(`Sheets webapp returned error: ${JSON.stringify(data)}`);
  }

  return data.rows;
}
