export class ChatController {
  static renderLobby = (req, res) => {
    res.render('chat', { currentUser: req.user })
  }

  static renderHome = (req, res) => {
    res.redirect('/lobby')
  }
}
