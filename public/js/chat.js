import { ulid } from 'https://unpkg.com/ulid@2.3.0/dist/index.js'

import { currentUser } from '../../../../../js/globals.js'
import { saveMessage } from './local-db.js'

let formSubmitHandler

const form = document.getElementById('chat-form')
const input = document.getElementById('input')
const messages = document.getElementById('messages')

document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.getElementById('menuButton')
  const menu = document.getElementById('menu')

  if (!menuButton || !menu) {
    console.error('menuButton or menu not found in the DOM')
    return
  }

  menuButton.addEventListener('click', () => {
    const isHidden = menu.classList.contains('hidden')
    if (isHidden) {
      menu.classList.remove('hidden')
      menu.classList.remove('scale-95')
      menu.classList.add('scale-100')
    } else {
      menu.classList.add('hidden')
      menu.classList.remove('scale-100')
      menu.classList.add('scale-95')
    }
  })

  document.addEventListener('click', (event) => {
    if (!menu.contains(event.target) && !menuButton.contains(event.target)) {
      menu.classList.add('hidden')
      menu.classList.remove('scale-100')
      menu.classList.add('scale-95')
    }
  })
})

const handleFormSubmit = (socket) => (event) => {
  event.preventDefault()

  const message = input.value.trim()

  if (!message) return

  const messageULID = ulid()
  addMessageToUI(message, messageULID, true, true, currentUser.id)

  saveMessage(messageULID, message)

  if (socket.connected) {
    socket.emit('chat message', message, messageULID)
  }

  input.value = ''
}

export const resetFormAndMessages = (socket) => {
  if (formSubmitHandler) {
    form.removeEventListener('submit', formSubmitHandler)
  }
  formSubmitHandler = handleFormSubmit(socket)
  form.addEventListener('submit', formSubmitHandler)

  messages.replaceChildren()
}

export const addMessageToUI = (message, messageULID, isCurrentUser, isLocal, userId) => {
  let item = document.getElementById(messageULID)

  if (item) return

  const children = Array.from(messages.children)

  const insertBeforeItem = children.find((child) =>
    child.id.localeCompare(messageULID) > 0
  )

  const previousItem = insertBeforeItem
    ? insertBeforeItem.previousElementSibling
    : children[children.length - 1]

  const isFirstInChain =
    !previousItem || previousItem.dataset.userId !== userId

  const itemHTML = `
    <li 
      id="${messageULID}" 
      data-user-id="${userId}" 
      class="${(isCurrentUser && isLocal) ? 'local-message' : 'remote-message'} 
        relative p-3 rounded-md 
        text-[#212121]
        ${isCurrentUser ? 'bg-[#FFF8E1]' : 'bg-[#F5F5F5]'} 
        ${isCurrentUser ? 'mr-[0.2em] ml-[4em]' : 'mr-[4em] ml-[0.2em]'}
        ${isFirstInChain ? 'mt-[1.2em]' : 'mt-[0.4em]'}">
      ${isFirstInChain
            ? `<svg xmlns="http://www.w3.org/2000/svg" class="absolute top-0 ${isCurrentUser ? 'right-0 translate-x-2' : 'left-0 -translate-x-2'}" width="20" height="20" viewBox="0 0 20 20">
          <path d="${isCurrentUser ? 'M0 0 L0 20 L20 0 Z' : 'M20 20 L20 0 L0 0 Z'}" fill="${isCurrentUser ? '#FFF8E1' : '#F5F5F5'}"></path>
        </svg>`
            : ''}
      <p class="content">${message}</p>
    </li>`

  const template = document.createElement('template')
  template.innerHTML = itemHTML.trim()
  item = template.content.firstChild

  if (insertBeforeItem) {
    messages.insertBefore(item, insertBeforeItem)
  } else {
    messages.appendChild(item)
  }

  messages.scrollTop = messages.scrollHeight
}

export const updateMessageInUI = (newMessage, messageULID) => {
  const item = document.getElementById(messageULID)

  if (!item) return

  item.querySelector('.content').textContent = newMessage

  item.classList.remove('local-message')
  item.classList.add('remote-message')
}
