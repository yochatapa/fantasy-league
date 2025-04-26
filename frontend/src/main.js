import './assets/main.css'
import '@mdi/font/css/materialdesignicons.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify';

import { useAlertStore } from '@/stores/alertStore';

const app = createApp(App)

app.use(vuetify)
app.use(createPinia())
app.use(router)

const alertStore = useAlertStore();

window.alert = (message, type) => {
    alertStore.Alert(message, type);
};

window.confirm = async (message) => {
    return await alertStore.Confirm(message);
};

app.mount('#app')