const form = document.getElementById('addUserForm');
const alertBox = document.getElementById('alert');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const repassword = document.getElementById('repassword').value;
  const type = document.getElementById('type').value;
  const empId = document.getElementById('empId').value.trim();

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

  if (password !== repassword) return showAlert("❌ Passwords do not match!", "black");
  if (!passwordRegex.test(password)) return showAlert("❌ Password must meet complexity requirements.", "black");

  const res = await fetch('/admin/add-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, email, password, type, empId })
  });

  const msg = await res.text();
  if (res.ok) {
    showAlert("✅ " + msg, "green");
    form.reset();
    fetchUsers();
  } else {
    showAlert("❌ " + msg, "black");
  }
});

async function fetchUsers() {
  const res = await fetch('/admin/users');
  const users = await res.json();
  const tableBody = document.getElementById('userTable');
  tableBody.innerHTML = '';

  users.forEach(user => {
    const row = `<tr class="border-b hover:bg-gray-50">
      <td class="px-4 py-2">${user.name}</td>
      <td class="px-4 py-2">${user.email}</td>
      <td class="px-4 py-2">${user.phone}</td>
      <td class="px-4 py-2">${user.empId}</td>
      <td class="px-4 py-2 capitalize">${user.type}</td>
    </tr>`;
    tableBody.innerHTML += row;
  });
}

function showAlert(message, color) {
  alertBox.textContent = message;
  alertBox.className = `text-${color} bg-${color === 'black' ? 'yellow-100' : color + '-100'} border border-${color === 'black' ? 'yellow-400' : color + '-300'} p-3 rounded-lg mt-4`;
  alertBox.classList.remove('hidden');
  setTimeout(() => alertBox.classList.add('hidden'), 4000);
}

window.onload = fetchUsers;

document.getElementById('registerFingerprint').addEventListener('click', async () => {
  try {
    const publicKey = {
      challenge: Uint8Array.from('randomChallengeString', c => c.charCodeAt(0)),
      rp: { name: "Secure Auth Admin Panel" },
      user: {
        id: Uint8Array.from('unique-user-id', c => c.charCodeAt(0)),
        name: "user@example.com",
        displayName: "User Full Name"
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred"
      },
      timeout: 60000,
      attestation: "none"
    };

    const credential = await navigator.credentials.create({ publicKey });

    if (credential) {
      document.getElementById('fingerprintStatus').classList.remove('hidden');
      showAlert("✅ Fingerprint registered (simulated).", "green");
    }
  } catch (err) {
    showAlert("❌ Fingerprint registration failed: " + err.message, "black");
  }
});
