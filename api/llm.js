import { handleApiRequest } from '../api-handler.js';

export default async function handler(request, response) {
  try {
    await handleApiRequest(request, response);
  } catch {
    if (!response.headersSent) {
      response.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'The API request could not be completed.' }));
    }
  }
}
