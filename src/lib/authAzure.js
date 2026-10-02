import { PublicClientApplication } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID || 'd385adbf-40fc-4c28-9bcd-d65ce7b314d3'
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '0b23624a-5d0f-4c23-a848-ddf670439266'

const msalConfig = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true,
  },
}

let msalInstance = null

export async function getMsalInstance() {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(msalConfig)
    await msalInstance.initialize()
  }
  return msalInstance
}

// Procesar el hash de retorno si viene de redirección
export async function handleRedirectAuth() {
  try {
    const msal = await getMsalInstance()
    const redirectResponse = await msal.handleRedirectPromise()
    if (redirectResponse && redirectResponse.account) {
      return redirectResponse.account
    }
    const accounts = msal.getAllAccounts()
    if (accounts.length > 0) {
      return accounts[0]
    }
  } catch (err) {
    console.error('Error handling redirect promise:', err)
  }
  return null
}

export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
  prompt: 'select_account',
}

// Iniciar sesión con redirección fluida (sin riesgo de popup anidado)
export async function loginWithMicrosoft() {
  const msal = await getMsalInstance()
  
  // Si estamos en una ventana popup o ya hay un proceso, usar redirect directo
  try {
    await msal.loginRedirect(loginRequest)
  } catch (err) {
    console.error('Error en loginRedirect:', err)
    throw err
  }
}

// Cerrar sesión
export async function logoutMicrosoft() {
  try {
    const msal = await getMsalInstance()
    const activeAccount = msal.getActiveAccount() || msal.getAllAccounts()[0]
    if (activeAccount) {
      await msal.logoutRedirect({ account: activeAccount })
    }
  } catch (err) {
    console.error('Error al cerrar sesión de Microsoft:', err)
  }
}
