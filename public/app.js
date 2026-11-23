const rows = document.querySelector('#college-rows');
const count = document.querySelector('#row-count');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#college-dialog');
const form = document.querySelector('#college-form');
const errorMessage = document.querySelector('#form-error');
const saveButton = document.querySelector('#save-button');
const updatedLabel = document.querySelector('#updated-label');
const toast = document.querySelector('#toast');
let editingId = null;
let toastTimeout;

async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || 'Something went wrong. Please try again.');
  }
  return response.status === 204 ? null : response.json();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function makeCell(text, className) {
  const cell = document.createElement('td');
  const content = document.createElement('span');
  content.textContent = text;
  if (className) content.className = className;
  cell.append(content);
  return cell;
}

function render(data) {
  rows.replaceChildren();
  count.textContent = data.length;
  emptyState.hidden = data.length > 0;
  document.querySelector('table').hidden = data.length === 0;

  for (const item of data) {
    const tr = document.createElement('tr');
    tr.append(makeCell(item.country, 'country-tag'));
    tr.append(makeCell(item.college, 'college-name'));
    tr.append(makeCell(item.igcseNeeded));

    const actions = document.createElement('td');
    const actionGroup = document.createElement('div');
    actionGroup.className = 'row-actions';
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'icon-button'; edit.setAttribute('aria-label', `Edit ${item.college}`); edit.title = 'Edit'; edit.textContent = '✎';
    edit.addEventListener('click', () => openDialog(item));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'icon-button delete'; remove.setAttribute('aria-label', `Delete ${item.college}`); remove.title = 'Delete'; remove.textContent = '×';
    remove.addEventListener('click', () => deleteRow(item));
    actionGroup.append(edit, remove);
    actions.append(actionGroup);
    tr.append(actions);
    rows.append(tr);
  }
}

async function loadRows() {
  try {
    render(await request('/api/colleges'));
  } catch (error) {
    showToast(error.message);
  }
}

function openDialog(item = null) {
  editingId = item?.id ?? null;
  form.reset();
  errorMessage.hidden = true;
  document.querySelector('#dialog-title').textContent = editingId ? 'Edit college' : 'Add a college';
  saveButton.innerHTML = editingId ? 'Save changes <span aria-hidden="true">→</span>' : 'Save college <span aria-hidden="true">→</span>';
  if (item) {
    form.elements.country.value = item.country;
    form.elements.college.value = item.college;
    form.elements.igcseNeeded.value = item.igcseNeeded;
  }
  dialog.showModal();
  form.elements.country.focus();
}

async function deleteRow(item) {
  if (!window.confirm(`Delete ${item.college} in ${item.country}? This cannot be undone.`)) return;
  try {
    await request(`/api/colleges/${item.id}`, { method: 'DELETE' });
    await loadRows();
    updatedLabel.textContent = 'Just updated';
    showToast('College removed.');
  } catch (error) {
    showToast(error.message);
  }
}

document.querySelector('#add-button').addEventListener('click', () => openDialog());
document.querySelector('#empty-add-button').addEventListener('click', () => openDialog());
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorMessage.hidden = true;
  saveButton.disabled = true;
  saveButton.textContent = 'Saving…';
  const body = Object.fromEntries(new FormData(form).entries());
  try {
    await request(editingId ? `/api/colleges/${editingId}` : '/api/colleges', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    dialog.close();
    await loadRows();
    updatedLabel.textContent = 'Just updated';
    showToast(editingId ? 'College updated.' : 'College added.');
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.hidden = false;
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = editingId ? 'Save changes <span aria-hidden="true">→</span>' : 'Save college <span aria-hidden="true">→</span>';
  }
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});

loadRows();
