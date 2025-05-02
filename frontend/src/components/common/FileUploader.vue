<template>
    <div>
        <!-- 드롭 영역 + 파일 추가 버튼 -->
        <v-file-input
            v-model="fileInput"
            multiple
            show-size
            accept="*/*"
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
        default: () => [] // [{ id, name, url }]
    }
})

const fileInput = ref(null)
const newFiles = ref([])
const newFilesName = ref([])
const existingFiles = computed(() => props.initialFiles)
const deletedFiles = ref([])

function handleFileAdd(e) {
    const files = e.target.files
    if (!files) return
    newFiles.value.push(...files)
    for(let idx=0;idx<files.length;idx++){
        newFilesName.value.push(files[idx].name)
    }
    fileInput.value = null
    console.log(newFiles.value,files)
}

function removeNewFile(index) {
    newFiles.value.splice(index, 1)
}

function removeExistingFile(index) {
    const removed = existingFiles.value.splice(index, 1)[0]
    deletedFiles.value.push({
        file_id : removed.file_id
        , sn : removed.sn
    })
}

defineExpose({
    getNewFiles: () => newFiles.value,
    getDeletedFiles: () => deletedFiles.value
})
</script>
