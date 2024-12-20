export const currentUser = (() => {
  const chatContainer = document.getElementById('messages')
  if (!chatContainer) {
    console.error('No se encontró el contenedor del chat.')
    return null
  }

  return JSON.parse(chatContainer.dataset.user)
})()
