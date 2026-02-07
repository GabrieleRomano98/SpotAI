import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Lobby from './views/Lobby.vue'
import Game from './views/Game.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/lobby/:code',
      name: 'Lobby',
      component: Lobby,
      props: true
    },
    {
      path: '/game/:code',
      name: 'Game',
      component: Game,
      props: true
    }
  ]
})

const app = createApp(App)
app.use(router)
app.mount('#app')
