<template>
    <div>
        <!-- 드롭 영역 + 파일 추가 버튼 -->
        <v-file-input
            v-model="fileInput"
            :multiple="multiple"
            show-size
            :accept="acceptType"
            label="파일을 업로드하거나 드래그 앤 드롭하세요"
            prepend-icon="mdi-paperclip"
            @change="handleFileAdd"
            :clearable="false"
        />

        <!-- 신규 추가된 파일 목록 -->
        <v-list v-if="newFiles.length > 0" class="pa-0">
            <v-list-item
                v-for="(file, index) in newFilesName"
                :key="'new-' + index"
                :title="file"
            >
                <template #append>
                    <v-icon @click="removeNewFile(index)">mdi-delete</v-icon>
                </template>
            </v-list-item>
        </v-list>

        <!-- 기존 파일 목록 -->
        <v-list v-if="existingFiles.length > 0" class="pa-0">
            <v-list-item
                v-for="(file, index) in existingFiles"
                :key="'existing-' + file.id"
                :title="file.original_name"
            >
                <template #append>
                    <v-icon class="mr-2">mdi-download</v-icon>
                    <v-icon @click="removeExistingFile(index)">mdi-delete</v-icon>
                </template>
            </v-list-item>
        </v-list>
    </div>
</template>

<script setup>
import { ref, defineExpose, computed } from 'vue'

const props = defineProps({
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
})

const fileInput = ref(null)
const newFiles = ref([])
const newFilesName = ref([])
const deletedFiles = ref([])

const existingFiles = computed(() => props.initialFiles)

const acceptType = computed(() =>
    props.type === 'image' ? 'image/*' : '*/*'
)

function handleFileAdd(e) {
    const files = e.target.files
    if (!files || files.length === 0) return

    const validFiles = []

    for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // 최대 크기 초과 필터링
        if (file.size > props.maxSize) {
            alert(`'${file.name}'은(는) 허용된 최대 크기(${(props.maxSize / 1024 / 1024).toFixed(1)}MB)를 초과했습니다.`)
            continue
        }

        // 이미지 전용일 경우 type 검사
        if (props.type === 'image' && !file.type.startsWith('image/')) {
            alert(`'${file.name}'은(는) 이미지 파일이 아닙니다.`)
            continue
        }

        validFiles.push(file)

        // multiple이 false면 첫 파일만 허용
        if (!props.multiple) break
    }

    // 유효한 파일이 없으면 기존 유지
    if (validFiles.length === 0) {
        fileInput.value = null
        return
    }

    // multiple = false이면 이전 것 모두 제거하고 한 개만 유지
    if (!props.multiple) {
        // 기존 newFiles 삭제
        newFiles.value = []
        newFilesName.value = []

        // 기존 existingFiles는 삭제 처리
        if (existingFiles.value.length > 0) {
            existingFiles.value.forEach(f => {
                deletedFiles.value.push({
                    file_id: f.file_id,
                    sn: f.sn
                })
            })

            props.initialFiles.splice(0) // 강제로 비워주기
        }
    }

    newFiles.value.push(...validFiles)
    newFilesName.value.push(...validFiles.map(f => f.name))

    fileInput.value = null
}

function removeNewFile(index) {
    newFiles.value.splice(index, 1)
    newFilesName.value.splice(index, 1)
}

function removeExistingFile(index) {
    const removed = existingFiles.value.splice(index, 1)[0]
    deletedFiles.value.push({
        file_id: removed.file_id,
        sn: removed.sn
    })
}

defineExpose({
    getNewFiles: () => newFiles.value,
    getDeletedFiles: () => deletedFiles.value
})
</script>
