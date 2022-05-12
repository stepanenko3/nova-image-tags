import IndexField from './components/IndexField'
import DetailField from './components/DetailField'
import FormField from './components/FormField'

Nova.booting((app, store) => {
  app.component('index-nova-image-tags', IndexField)
  app.component('detail-nova-image-tags', DetailField)
  app.component('form-nova-image-tags', FormField)
})
