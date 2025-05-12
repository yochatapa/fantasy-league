import './assets/main.css';

import '@mdi/font/css/materialdesignicons.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';

import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

import { useAlertStore } from '@/stores/alertStore';

// Vuetify 한국어 설정
import { ko } from 'vuetify/locale';

const vuetify = createVuetify({
    components,
    directives,
    locale: {
        locale: 'ko',
        messages: {
            ko: {
                ...ko,
                stepper: {
                    prev: '이전',
                    next: '다음',
                },
            }
        }
    },
    defaults: {
        VTextField: {
            autocomplete: 'off',
        },
        VSelect: {
            autocomplete: 'off',
        },
        VCombobox: {
            autocomplete: 'off',
        },
    },
});

const app = createApp(App);

app.use(vuetify);
app.use(createPinia());
app.use(router);

// ✅ window.alert, confirm 커스텀
const alertStore = useAlertStore();

window.alert = (message, type) => {
    alertStore.Alert(message, type);
};

window.confirm = async (message) => {
    return await alertStore.Confirm(message);
};

app.mount('#app');
