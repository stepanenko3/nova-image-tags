<template>
    <PanelItem :index="index" :field="field">
        <template #value>
            <div v-if="field.image" class="relative block">
                <img
                    class="rounded-lg block w-full"
                    ref="picture"
                    :src="field.image"
                >

                <div
                    v-for="(row, i) in field.rows"
                    class="picture-tag tooltip"
                    :data-tooltip="__('Index') + ': ' + (i + 1)"
                    :style="{
                        top: row.fields.filter(f => f.attribute.toLowerCase() === 'y')[0].value + '%',
                        left: row.fields.filter(f => f.attribute.toLowerCase() === 'x')[0].value + '%',
                    }"
                ></div>
            </div>
            <template v-else>
                -
            </template>
        </template>
    </PanelItem>
</template>

<script>
    export default {
        props: ['index', 'resource', 'resourceName', 'resourceId', 'field'],
    }
</script>
