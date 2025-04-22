const validation = {
    isEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    isPassword : (password) => {
        const lengthValid = password.length >= 8 && password.length <= 20;
        const numberValid = /[0-9]/.test(password);
        const specialCharValid = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        return {
            lengthValid,
            numberValid,
            specialCharValid,
            isAllValid: lengthValid && numberValid && specialCharValid,
        }
    }
};

export default validation;