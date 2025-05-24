// store/alertStore.js 또는 .ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAlertStore = defineStore('alert', () => {
    const snackbar = ref(false);
    const snackbarMessage = ref('');
    const snackbarColor = ref('primary');

    const dialog = ref(false);
    const dialogMessage = ref('');
    let confirmResolve = null;

    const promptDialog = ref(false);
    const promptMessage = ref('');
    const promptValue = ref('');
    const promptType = ref('text'); // 'text', 'number', 'select'
    const promptRules = ref([]);
    const promptOptions = ref([]); // select 옵션용
    const promptItemValue = ref(''); // select에서 사용할 value key
    const promptItemTitle = ref(''); // select에서 사용할 title key
    const promptMultiple = ref(false);

    function Alert(message, color = 'primary') {
        snackbarMessage.value = message;
        snackbarColor.value = color;
        snackbar.value = true;
    }

    function Confirm(message) {
        dialogMessage.value = message.replaceAll('\n', '<br>');
        dialog.value = true;

        return new Promise((resolve) => {
            confirmResolve = resolve;
        });
    }    

    function Prompt(message, defaultValue = '', options = {}) {
        promptMessage.value = message;
        promptValue.value = defaultValue  || null;
        promptType.value = options.type || 'text';
        promptRules.value = options.rules || [];
        promptOptions.value = options.options || [];
        promptItemValue.value = options.itemValue || 'value';
        promptItemTitle.value = options.itemTitle || 'title';
        promptMultiple.value = options.multiple || false;
        promptDialog.value = true;

        return new Promise((resolve) => {
            confirmResolve = resolve;
        });
    }

    function confirmYes() {
        dialog.value = false;
        if (confirmResolve) confirmResolve(true);
    }

    function confirmNo() {
        dialog.value = false;
        if (confirmResolve) confirmResolve(false);
    }

    const promptValid = computed(() => {
        return promptRules.value.every(rule => rule(promptValue.value) === true);
    });

    function promptSubmit() {
        promptDialog.value = false;
        if (confirmResolve) confirmResolve(promptValue.value);
    }

    function promptCancel() {
        promptDialog.value = false;
        if (confirmResolve) confirmResolve(null);
    }

    return {
        snackbar,
        snackbarMessage,
        snackbarColor,
        dialog,
        dialogMessage,
        confirmYes,
        confirmNo,
        promptDialog,
        promptMessage,
        promptValue,
        promptType,
        promptRules,
        promptOptions,
        promptItemValue,
        promptItemTitle,
        promptValid,
        promptMultiple,
        promptSubmit,
        promptCancel,
        Alert,
        Confirm,
        Prompt
    };
});
