<template>
    <v-menu
        v-model="menu"
        :close-on-content-click="false"
        transition="scale-transition"
        offset-y
        min-width="auto"
    >
        <template #activator="{ props }">
            <v-text-field
                v-model="input"
                v-bind="props"
                :label="label"
                :rules="internalRules"
                :disabled="disabled"
                :required="required"
                readonly
                @click.stop
                @blur="onBlur"
            />
        </template>

        <v-card>
            <v-time-picker
                v-model="tempTime"
                :format="is12Hour ? 'ampm' : '24hr'"
                full-width
                hide-actions
            />
            <v-card-actions v-if="is12Hour">
                <v-btn
                    :variant="ampm === 'AM' ? 'tonal' : 'text'"
                    @click.stop="setAmPm('AM')"
                >AM</v-btn>
                <v-btn
                    :variant="ampm === 'PM' ? 'tonal' : 'text'"
                    @click.stop="setAmPm('PM')"
                >PM</v-btn>
            </v-card-actions>
            <v-card-actions>
                <v-btn text @click="cancelTime">취소</v-btn>
                <v-spacer></v-spacer>
                <v-btn text color="primary" @click="confirmTime">확인</v-btn>
            </v-card-actions>
        </v-card>
    </v-menu>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue';
import { VTimePicker } from 'vuetify/labs/VTimePicker';

defineOptions({
    components: { VTimePicker },
});

const props = defineProps({
    modelValue: [String, null],
    label: String,
    rules: {
        type: Array,
        default: () => [],
    },
    disabled: Boolean,
    required: Boolean,
    is12Hour: {
        type: Boolean,
        default: false,
    },
});

const emit = defineEmits(['update:modelValue']);

const menu = ref(false);
const input = ref('');
const pickerTime = ref('');        // 실제 적용된 시간
const tempTime = ref('');          // UI 작업용 임시 시간
const ampm = ref('AM');
const originalTime = ref('');

const pad = (n) => n.toString().padStart(2, '0');

function formatTime24To12(timeStr) {
    if (!timeStr) return '';
    let [h, m] = timeStr.split(':').map(Number);
    const meridian = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${pad(h)}:${pad(m)} ${meridian}`;
}

watch(() => props.modelValue, (val) => {
    if (val && /^\d{2}:\d{2}$/.test(val)) {
        pickerTime.value = val;
        tempTime.value = val;
        originalTime.value = val;
        ampm.value = parseInt(val.split(':')[0], 10) >= 12 ? 'PM' : 'AM';
        input.value = props.is12Hour ? formatTime24To12(val) : val;
    } else {
        pickerTime.value = '';
        tempTime.value = '';
        originalTime.value = '';
        input.value = '';
    }
});

onMounted(() => {
    if (props.modelValue && /^\d{2}:\d{2}$/.test(props.modelValue)) {
        pickerTime.value = props.modelValue;
        tempTime.value = props.modelValue;
        originalTime.value = props.modelValue;
        ampm.value = parseInt(props.modelValue.split(':')[0], 10) >= 12 ? 'PM' : 'AM';
        input.value = props.is12Hour ? formatTime24To12(props.modelValue) : props.modelValue;
    }
});

const setAmPm = async (newAmPm) => {
    if (!tempTime.value) {
        ampm.value = newAmPm;
        return;
    }

    const [h, m] = tempTime.value.split(':').map(Number);
    let newHour = h;

    if (newAmPm === 'PM' && h < 12) newHour = h + 12;
    if (newAmPm === 'AM' && h >= 12) newHour = h - 12;

    const newTime = `${pad(newHour)}:${pad(m)}`;

    ampm.value = newAmPm;
    tempTime.value = newTime;
};

const confirmTime = () => {
    if (!tempTime.value) {
        input.value = '';
        emit('update:modelValue', '');
        pickerTime.value = '';
        originalTime.value = '';
        menu.value = false;
        return;
    }

    pickerTime.value = tempTime.value;
    input.value = props.is12Hour ? formatTime24To12(tempTime.value) : tempTime.value;
    emit('update:modelValue', tempTime.value);
    originalTime.value = tempTime.value;
    menu.value = false;
};

const cancelTime = () => {
    tempTime.value = originalTime.value;
    ampm.value = parseInt(originalTime.value.split(':')[0], 10) >= 12 ? 'PM' : 'AM';
    input.value = props.is12Hour ? formatTime24To12(originalTime.value) : originalTime.value;
    menu.value = false;
};

const onBlur = () => {
    // nothing - prevent auto close
};

const internalRules = computed(() => {
    const base = [...props.rules];
    if (props.required) {
        base.unshift((v) => !!v || '시간을 선택해주세요.');
    }
    return base;
});
</script>

<style scoped>
:deep(.v-overlay__content) {
    min-width: auto !important;
}
</style>
