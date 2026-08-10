import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Quando o app é servido fora do Base44 (ex.: Vercel), o appBaseUrl acaba
// apontando para o domínio estático e as chamadas POST (funções) retornam 405.
// Nesse caso ignoramos o valor para o SDK usar o servidor padrão do Base44.
const isBase44Url = (url) => {
  try {
    return new URL(url).hostname.includes('base44');
  } catch {
    return false;
  }
};

const safeBaseUrl = appBaseUrl && isBase44Url(appBaseUrl) ? appBaseUrl : undefined;

//Create a client with authentication required
export const base44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: safeBaseUrl,
  requiresAuth: false,
  appBaseUrl: safeBaseUrl,
});