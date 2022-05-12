<template>
    <span>{{ field.value.length }}</span>
</template>

<script>
export default {
    props: ['resourceName', 'field'],
}
</script>
