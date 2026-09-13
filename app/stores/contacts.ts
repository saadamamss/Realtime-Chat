import { defineStore } from 'pinia'

export const useContactsStore = defineStore('contacts', () => {
  const contactList = ref<any[]>([])
  const contactIds = ref<Set<string>>(new Set())
  const contactPhone = ref('')
  const addingContact = ref(false)
  const addContactError = ref('')

  let axios: any = null

  function setAxios(instance: any) {
    axios = instance
  }

  function isContact(id: string) {
    return contactIds.value.has(id)
  }

  function displayName(other: any) {
    if (!other) return 'Unknown'
    return contactIds.value.has(other.id) ? other.name : (other.phone_number || other.name)
  }

  async function loadContacts() {
    const { data } = await axios.get('/contacts')
    const myContacts: any[] = data.contacts || []
    contactList.value = myContacts
    contactIds.value = new Set(myContacts.map((c: any) => c.id))
  }

  async function addContactByPhone() {
    if (!contactPhone.value.trim() || addingContact.value) return
    addingContact.value = true
    addContactError.value = ''
    try {
      const { data } = await axios.post('/contacts', { phone_number: contactPhone.value.trim() })
      contactIds.value.add(data.contact.id)
      contactList.value.push(data.contact)
      contactPhone.value = ''
    } catch (e: any) {
      addContactError.value = e?.response?.data?.message || 'Failed to add contact'
    } finally {
      addingContact.value = false
    }
  }

  async function removeContact(contact: any) {
    try {
      await axios.delete('/contacts', { data: { contact_id: contact.id } })
      contactList.value = contactList.value.filter((c: any) => c.id !== contact.id)
      contactIds.value.delete(contact.id)
    } catch {
      // handled by caller
    }
  }

  function reset() {
    contactList.value = []
    contactIds.value = new Set()
    contactPhone.value = ''
    addingContact.value = false
    addContactError.value = ''
  }

  return {
    contactList,
    contactIds,
    contactPhone,
    addingContact,
    addContactError,
    setAxios,
    isContact,
    displayName,
    loadContacts,
    addContactByPhone,
    removeContact,
    reset,
  }
})
