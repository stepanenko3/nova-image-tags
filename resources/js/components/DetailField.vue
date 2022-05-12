<template>
    <PanelItem :index="index" :field="field">
        <template #value>
            <div class="relative block">
                <img
                    class="rounded-lg block w-full"
                    ref="picture"
                    :src="resource.fields.filter(f => f.attribute === field.imageAttribute)[0].value"
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
        </template>
    </PanelItem>
</template>

<script>
    export default {
        props: ['index', 'resource', 'resourceName', 'resourceId', 'field'],
    }
</script>
