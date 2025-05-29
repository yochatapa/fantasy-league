<template>
    <div>
        <v-file-input
            v-model="fileInput"
            :multiple="multiple"
            show-size
            :accept="acceptType"
            :label="(type==='image'?'사진':'파일')+'을 업로드하거나 드래그 앤 드롭하세요'"
            :prepend-icon="prependIcon"
            @change="handleFileAdd"
            :clearable="false"
        />

        <div v-if="type === 'image'">
            <v-row>
                <v-col
                    v-for="(file, index) in newFilesName"
                    :key="'new-' + index"
                    cols="12"
                    md="6"
                    lg="4"
                    class="mb-4"
                >
                    <v-card>
                        <div class="d-flex justify-center align-center" style="height: 200px;">
                            <v-img
                                v-if="file.path"
                                :src="file.path"
                                class="rounded"
                                contain
                                style="height: 200px; width: 200px;"
                            />
                            <v-icon
                                v-else
                                size="150"
                                class="ma-auto"
                            >
                                mdi-file
                            </v-icon>
                        </div>

                        <v-card-actions class="d-flex justify-between">
                            <div class="flex-grow-1 text-truncate pl-2">
                                {{ file.name }}
                            </div>

                            <div class="pr-2 d-flex">
                                <v-icon class="" color="red" @click="removeNewFile(index)">mdi-delete</v-icon>
                            </div>
                        </v-card-actions>
                    </v-card>
                </v-col>
                <v-col
                    v-for="(file, index) in existingFiles"
                    :key="'new-' + index"
                    cols="12"
                    md="6"
                    lg="4"
                    class="mb-4"
                >
                    <v-card>
                        <div class="d-flex justify-center align-center" style="height: 200px;">
                            <v-img
                                v-if="file.path"
                                :src="file.path"
                                class="rounded"
                                contain
                                style="height: 200px; width: 200px;"
                            />
                            <v-icon
                                v-else
                                size="150"
                                class="ma-auto"
                            >
                                mdi-file
                            </v-icon>
                        </div>

                        <v-card-actions class="d-flex justify-between">
                            <div class="flex-grow-1 text-truncate pl-2">
                                {{ file.original_name }}
                            </div>

                            <div class="pr-2 d-flex">
                                <v-icon class="mx-2" color="primary" @click="downloadFile(file.file_id, file.sn)">mdi-download</v-icon>
                                <v-icon class="" color="red" @click="removeNewFile(index)">mdi-delete</v-icon>
                            </div>
                        </v-card-actions>
                    </v-card>
                </v-col>
            </v-row>
        </div>
        <div v-else>
            <v-list v-if="newFiles.length > 0" class="pa-0">
                <v-list-item
                    v-for="(file, index) in newFilesName"
                    :key="'new-' + index"
                    :title="(index + 1) + '. '+ file"
                >
                    <template #append>
                        <v-icon @click="removeNewFile(index)">mdi-delete</v-icon>
                    </template>
                </v-list-item>
            </v-list>

            <v-list v-if="existingFiles.length > 0" class="pa-0">
                <v-list-item
                    v-for="(file, index) in existingFiles"
                    :key="'existing-' + file.file_id"
                    :title="(newFilesName.length + index + 1) + '. '+ file.original_name"
                >
                    <template #append>
                        <v-icon class="mr-2" @click="downloadFile(file.file_id,file.sn)">mdi-download</v-icon>
                        <v-icon @click="removeExistingFile(index)">mdi-delete</v-icon>
                    </template>
                </v-list-item>
            </v-list>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { commonFetch } from '@/utils/common/commonFetch';

const props = defineProps({
    modelValue: { // v-model 바인딩을 위한 prop
        type: Object,
        default: () => ({
            newFiles: [],
            deletedFiles: []
        })
    },
    initialFiles: {
        type: Array,
        default: () => []
    },
    multiple: {
        type: Boolean,
        default: true
    },
    maxSize: {
        type: Number,
        default: Infinity // 무제한
    },
    type: {
        type: String,
        default: 'file', // 'image' or 'file'
        validator: val => ['image', 'file'].includes(val)
    }
});

const emit = defineEmits(['update:modelValue']); // update:modelValue 이벤트 정의

const fileInput = ref(null);
const newFiles = ref([...(props.modelValue?.newFiles || [])]); // 초기값 설정
const newFilesName = computed(() => 
    newFiles.value.map(f => ({
        name: f.name,
        path: URL.createObjectURL(f)
    }))
);
const deletedFiles = ref([...(props.modelValue?.deletedFiles || [])]); // 초기값 설정

const existingFiles = ref(props.initialFiles.map(file => ({ ...file }))); // ref로 변경 및 얕은 복사

const acceptType = computed(() =>
    props.type === 'image' ? 'image/*' : '*/*'
);

const prependIcon = computed(()=>
    props.type === 'image' ? "mdi-image" : "mdi-paperclip"
)

// modelValue prop 감시 및 내부 상태 업데이트
watch(() => props.modelValue, (newValue) => {
    newFiles.value = [...(newValue?.newFiles || [])];
    deletedFiles.value = [...(newValue?.deletedFiles || [])];
});

// initialFiles prop 감시 및 existingFiles 업데이트 (배열과 내부 객체 복사)
watch(() => props.initialFiles, (newInitialFiles) => {
    existingFiles.value = newInitialFiles.map(file => ({ ...file }));
}, { deep: true });

function updateModelValue() {
    emit('update:modelValue', {
        newFiles: newFiles.value,
        deletedFiles: deletedFiles.value
    });
}

function handleFileAdd(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 최대 크기 초과 필터링
        if (file.size > props.maxSize) {
            alert(`'${file.name}'은(는) 허용된 최대 크기(${(props.maxSize / 1024 / 1024).toFixed(1)}MB)를 초과했습니다.`);
            continue;
        }

        // 이미지 전용일 경우 type 검사
        if (props.type === 'image' && !file.type.startsWith('image/')) {
            alert(`'${file.name}'은(는) 이미지 파일이 아닙니다.`);
            continue;
        }

        validFiles.push(file);

        // multiple이 false면 첫 파일만 허용
        if (!props.multiple) break;
    }

    // 유효한 파일이 없으면 기존 유지
    if (validFiles.length === 0) {
        fileInput.value = null;
        return;
    }

    // multiple = false이면 이전 것 모두 제거하고 한 개만 유지
    if (!props.multiple) {
        newFiles.value = [];
        deletedFiles.value.push(...existingFiles.value.map(f => ({ file_id: f.file_id, sn: f.sn })));
        existingFiles.value = [];
    }

    newFiles.value.push(...validFiles);
    fileInput.value = null;
    updateModelValue(); // modelValue 업데이트
}

function removeNewFile(index) {
    newFiles.value.splice(index, 1);
    updateModelValue(); // modelValue 업데이트
}

function removeExistingFile(index) {
    const removed = existingFiles.value.splice(index, 1)[0];
    deletedFiles.value.push({
        file_id: removed.file_id,
        sn: removed.sn
    });
    updateModelValue(); // modelValue 업데이트
}

const downloadFile = async (fileId, sn) => {
    try {
        const response = await commonFetch(`/api/file/download/${fileId}/${sn}`, {
            method: 'GET',
            responseType : "fileDownload"
        });
    } catch (err) {
        console.error(err);
        alert('파일 다운로드 중 오류가 발생했습니다.');
    }
};

defineExpose({
    getNewFiles: () => newFiles.value,
    getDeletedFiles: () => deletedFiles.value
});
</script>