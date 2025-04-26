import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAlertStore = defineStore('alert', () => {
    const snackbar = ref(false);
    const snackbarMessage = ref('');
    const snackbarColor = ref('primary');

    const dialog = ref(false);
    const dialogMessage = ref('');
    let confirmResolve = null;

    function Alert(message, color = 'primary') {
        snackbarMessage.value = message;
        snackbarColor.value = color;
        snackbar.value = true;
    }

    function Confirm(message) {
        dialogMessage.value = message.replaceAll("\n","<br>");
        dialog.value = true;

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

    return {
        snackbar,
        snackbarMessage,
        snackbarColor,
        dialog,
        dialogMessage,
        Alert,
        Confirm,
        confirmYes,
        confirmNo
    };
});
