import './assets/main.css';

import '@mdi/font/css/materialdesignicons.css';

import { createApp, nextTick } from 'vue';
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
            autocorrect: 'off',
            autocapitalize: 'off',
            spellcheck: false,
        },
        VSelect: {
            autocomplete: 'off',
        },
        VCombobox: {
            autocomplete: 'off',
        },
    }
});

const app = createApp(App);

app.use(vuetify);
app.use(createPinia());
app.use(router);

app.mixin({
    mounted() {
        // Vue가 DOM을 렌더링한 후에 input 요소들을 찾기 위해 nextTick 사용
        this.$nextTick(() => {
            // Vuetify 컴포넌트들 내부의 input 요소들만 처리
            if(this.$el.querySelectorAll){
                const inputs = this.$el.querySelectorAll('input');
                inputs.forEach((input) => {
                    input.setAttribute('autocomplete', 'off');
                    input.setAttribute('autocorrect', 'off');
                    input.setAttribute('autocapitalize', 'off');
                    input.setAttribute('spellcheck', 'false');
                });
            }
        });
    }
});


// ✅ window.alert, confirm 커스텀
const alertStore = useAlertStore();

window.alert = (message, type) => {
    alertStore.Alert(message, type);
};

window.confirm = async (message) => {
    return await alertStore.Confirm(message);
};

app.mount('#app');
