<template>
    <DefaultField :field="currentField" :errors="errors" :show-help-text="showHelpText">
        <template #field>
            <Loader v-if="loading"></Loader>

            <template v-else>
                <div
                    v-if="loadingError"
                    class="text-md text-red-500 font-medium"
                >
                    Dependent Image Loading Error
                </div>
                <div class="relative block" v-else>
                    <img
                        class="rounded-lg block w-full"
                        ref="picture"
                        :src="image"
                        @click="addRow"
                    >

                    <div
                        v-for="(row, i) in rows"
                        class="picture-tag tooltip"
                        :data-tooltip="__('Index') + ': ' + (i + 1) + (canDeleteRows ? (' / ' + __('Delete')) : '')"
                        @click="deleteRow(i)"
                        :style="{
                            top: row.filter(f => f.originalAttribute.toLowerCase() === 'y')[0].value + '%',
                            left: row.filter(f => f.originalAttribute.toLowerCase() === 'x')[0].value + '%',
                        }"
                    ></div>
                </div>
            </template>

            <div
                v-for="(element, i) in rows"
                :key="element[0].attribute"
                class="flex flex-col mt-3 border border-gray-200 dark:border-gray-900 dark:bg-gray-900 relative rounded-lg"
                style="margin-left: 42px"
            >
                <div
                    class="absolute py-2 px-1 flex flex-col mr-3 border border-gray-200 dark:border-gray-900 dark:bg-gray-900 rounded-lg"
                    :style="{
                        right: '100%',
                    }"
                >
                    <b class="mb-2 text-center">
                        {{ i + 1 }}
                    </b>

                    <Icon
                        class="hover:opacity-50 text-danger-500 cursor-pointer"
                        type="trash"
                        width="22"
                        height="22"
                        @click="deleteRow(i)"
                    />
                </div>

                <component
                    v-for="(rowField, j) in element"
                    :key="j"
                    :is="`form-${rowField.component}`"
                    :field="rowField"
                    :errors="repeatableValidation.errors"
                    :unique-id="getUniqueId(field, rowField)"
                    class="mr-3"
                    @change="changeField($event.target.value, i, j)"
                />
            </div>
        </template>
    </DefaultField>
</template>

<script>
    import { Errors } from 'form-backend-validation'
    import { DependentFormField, HandlesValidationErrors } from 'laravel-nova'
    import HandlesRepeatable from '../mixins/HandlesRepeatable';

    export default {
        mixins: [DependentFormField, HandlesValidationErrors, HandlesRepeatable],

        data: () => ({
            loading: true,
            loadingError: false,
            image: null,
        }),

        methods: {
            addRow(e) {
                if (!this.canAddRows) return;

                let coords = {};

                if (!this.loading && !this.loadingError) {
                    const pic = this.$refs.picture;

                    const bounds = pic.getBoundingClientRect();
                    const x = e.clientX - bounds.left;
                    const y = e.clientY - bounds.top

                    coords = {
                        x: (x / bounds.width * 100).toFixed(2),
                        y: (y / bounds.height * 100).toFixed(2),
                    };
                }

                const row = this.copyFields(this.currentField.fields, this.rows.length);

                row.map(field => {
                    if (coords.hasOwnProperty(field.originalAttribute.toLowerCase())) {
                        field.value = coords[field.originalAttribute.toLowerCase()];
                    }

                    return field;
                });

                this.rows.push(row);
            },

            deleteRow(index) {
                if (!this.canDeleteRows)
                    return;

                this.rows.splice(index, 1);
            },

            changeField(value, rowIndex, fieldIndex) {
                this.rows[rowIndex][fieldIndex].value = value;
            },

            onSyncedField() {
                this.loading = true;
                this.loadingError = false;

                this.toDataURL(this.currentField.image)
                    .then(dataUrl => {
                        if (dataUrl && dataUrl.indexOf('image/') !== -1) {
                            this.loadingError = false;
                            this.image = this.currentField.image
                        } else {
                            this.loadingError = true;
                            this.image = null;
                        }

                        this.loading = false;
                    });
            },

            toDataURL: url => fetch(url)
                .then(response => response.blob())
                .then(blob => new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onloadend = () => resolve(reader.result)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })),


            /**
             * Fill the given FormData object with the field's internal value.
             */
            fill(formData) {
                console.log(3, formData);
                const ARR_REGEX = () => /\[\d+\]$/g;
                const allValues = [];

                for (const row of this.rows) {
                    let formData = new FormData();
                    const rowValues = {};
                    // Fill formData with field values
                    row.forEach(field => field.fill(formData));
                    // Save field values to rowValues
                    for (const item of formData) {
                        let normalizedValue = null;
                        let key = item[0];

                        if (key.split('---').length === 3) {
                            key = key.split('---').slice(1).join('---');
                        }

                        key = key.replace(/---\d+/, '');
                        // Is key is an array, we need to remove the '.en' part from '.en[0]'
                        const isArray = !!key.match(ARR_REGEX());

                        if (isArray) {
                            const result = ARR_REGEX().exec(key);
                            key = `${key.slice(0, result.index)}${key.slice(result.index + result[0].length)}`;
                        }

                        try {
                            // Attempt to parse value
                            normalizedValue = JSON.parse(item[1]);
                        } catch (e) {
                            // Value is already a valid string
                            normalizedValue = item[1];
                        }

                        if (isArray) {
                            if (!rowValues[key]) rowValues[key] = [];
                            rowValues[key].push(normalizedValue);
                        } else {
                            rowValues[key] = normalizedValue;
                        }
                    }

                    allValues.push(rowValues);
                }

                console.log(JSON.stringify(allValues));
                formData.append(this.currentField.attribute, JSON.stringify(allValues));
            },
        },

        mounted() {
            this.onSyncedField();
        },

        computed: {
            repeatableValidation() {
                const fields = this.fields;
                const errors = this.errors.errors;
                const repeaterAttr = this.currentField.attribute;
                const safeRepeaterAttr = this.currentField.attribute.replace(/.{16}__/, '');
                const erroredFieldLocales = {};
                const formattedKeyErrors = {};

                // Find errored locales
                for (const field of fields) {
                    const fieldAttr = field.originalAttribute;
                    // Find all errors related to this field
                    const relatedErrors = Object.keys(errors).filter(
                        err => !!err.match(new RegExp(`^${safeRepeaterAttr}.\\d+.${fieldAttr}`))
                    );
                    const isTranslatable = field.component === 'translatable-field';
                    if (isTranslatable) {
                        const foundLocales = relatedErrors.map(errorKey => errorKey.split('.').slice(-1)).flat();
                        erroredFieldLocales[fieldAttr] = foundLocales;
                    }
                    // Format field
                    relatedErrors.forEach(errorKey => {
                        const rowIndex = errorKey.split('.')[1];
                        let uniqueKey = `${repeaterAttr}---${field.originalAttribute}---${rowIndex}`;
                        if (isTranslatable) {
                            const locale = errorKey.split('.').slice(-1)[0];
                            uniqueKey = `${uniqueKey}.${locale}`;
                        }
                        formattedKeyErrors[uniqueKey] = errors[errorKey];
                    });
                }

                return {
                    errors: new Errors(formattedKeyErrors),
                    locales: erroredFieldLocales,
                };
            },

            canAddRows() {
                if (!this.currentField.canAddRows)
                    return false;

                if (!!this.currentField.maxRows)
                    return this.rows.length < this.currentField.maxRows;

                return true;
            },

            canDeleteRows() {
                if (!this.currentField.canDeleteRows)
                    return false;

                if (!!this.currentField.minRows)
                    return this.rows.length > this.currentField.minRows;

                return true;
            },
        },
    }
</script>

<style>
    .picture-tag {
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        height: 32px;
        width: 32px;
        transform: translate3d(-50%, -50%, 0);
        background: rgba(0, 0, 0, 0.2);
        border: 2px solid transparent;
        border-radius: 9999px;
        transition: border-color .3s;
    }

    .picture-tag:after {
        content: "";
        position: absolute;
        height: 12px;
        width: 12px;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
        background: #fff;
        border-radius: 9999px;
        transition: transform .3s;
    }

    .picture-tag:hover {
        border-color: rgba(255, 255, 255, 0.5);
    }

    .picture-tag:hover:after {
        transform: scale(0.667);
    }

    .tooltip:before {
        content: attr(data-tooltip);
        position: absolute;
        bottom: 100%;
        left: 50%;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 8px;
        padding: 4px 8px;
        color: #fff;
        opacity: 0;
        pointer-events: none;
        text-align: center;
        transition: opacity .3s;
        transform: translate3d(-50%, -8px, 0);
        white-space: nowrap;
    }

    .tooltip:hover:before {
        opacity: 1;
    }
</style>
