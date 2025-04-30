// Initialize Supabase
const supabaseUrl = 'https://iuntxptbjopijwjymoje.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1bnR4cHRiam9waWp3anltb2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5OTQ0NzgsImV4cCI6MjA2MTU3MDQ3OH0.wKI00U8HMLMZcYEd3UZZlZgDdfslxCh3WaRAI8ElR5U';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const rsvpForm = document.getElementById('rsvpForm');
const guestForm = document.getElementById('guestForm');
const thankYou = document.getElementById('thankYou');
const attendingYes = document.getElementById('attendingYes');
const attendingNo = document.getElementById('attendingNo');
const guestCountSection = document.getElementById('guestCountSection');
const giftOption = document.getElementById('giftOption');
const giftDetails = document.getElementById('giftDetails');
const accountDetailsContainer = document.getElementById('accountDetailsContainer');
const accountDetailsList = document.getElementById('accountDetailsList');
const accountLoadingSpinner = document.getElementById('accountLoadingSpinner');
const submitButton = document.getElementById('submitButton');
const overlay = document.getElementById('overlay');
const overlaySpinner = document.getElementById('overlaySpinner');
const overlayMessage = document.getElementById('overlayMessage');

// Show overlay with message
function showOverlay(message, showSpinner = true) {
    overlayMessage.textContent = message;
    overlaySpinner.style.display = showSpinner ? 'block' : 'none';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Hide overlay
function hideOverlay() {
    overlay.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Event listeners
attendingYes.addEventListener('change', function() {
    if(this.checked) {
        guestCountSection.style.display = 'block';
    }
});

attendingNo.addEventListener('change', function() {
    if(this.checked) {
        guestCountSection.style.display = 'none';
    }
});

giftOption.addEventListener('change', async function() {
    const selectedMethod = this.value;

    if(selectedMethod !== 'none') {
        accountDetailsContainer.style.display = 'block';
        giftDetails.style.display = 'block';

        // Show loading state
        accountDetailsList.innerHTML = '';
        accountLoadingSpinner.style.display = 'block';
        submitButton.style.display = 'none';

        // Fetch account details from Supabase
        try {
            const { data: accounts, error } = await supabase
                .from('gift_accounts')
                .select('*')
                .eq('method', selectedMethod)
                .eq('active', true)
                .order('id', { ascending: true });

            if (error) throw error;

            // Hide loading spinner
            accountLoadingSpinner.style.display = 'none';
            submitButton.style.display = 'block';

            // Display account details
            if (accounts && accounts.length > 0) {
                accountDetailsList.innerHTML = '';

                accounts.forEach(account => {
                    const accountItem = document.createElement('div');
                    accountItem.className = 'account-item';

                    let accountHtml = '';

                    if (account.account_name) {
                        accountHtml += `<h6>${account.account_name}</h6>`;
                    }

                    if (account.account_details) {
                        accountHtml += `<p class="mb-1"><strong>Details:</strong> ${account.account_details}</p>`;
                    }

                    if (account.account_type) {
                        accountHtml += `<p class="mb-1"><strong>Name:</strong> ${account.account_type}</p>`;
                    }

                    if (account.instructions) {
                        accountHtml += `<p class="mb-1 text-muted"><small>${account.instructions}</small></p>`;
                    }

                    if (account.qr_code_url) {
                        accountHtml += `
                            <div class="text-center mt-2">
                                <img src="${account.qr_code_url}" alt="QR Code" style="max-width: 150px; height: auto;">
                            </div>
                        `;
                    }

                    // Only add the item if there's content to show
                    if (accountHtml) {
                        accountItem.innerHTML = accountHtml;
                        accountDetailsList.appendChild(accountItem);
                    }
                });

                // If no items were added (all fields null)
                if (accountDetailsList.children.length === 0) {
                    accountDetailsList.innerHTML = '<p>No account details available for this method.</p>';
                }
            } else {
                accountDetailsList.innerHTML = '<p>No account details available for this method.</p>';
            }
        } catch (error) {
            console.error('Error fetching account details:', error);
            accountLoadingSpinner.style.display = 'none';
            submitButton.style.display = 'block';
            accountDetailsList.innerHTML = '<p class="text-danger">Error loading account details. Please try again.</p>';
        }
    } else {
        accountDetailsContainer.style.display = 'none';
        giftDetails.style.display = 'none';
    }
});

// Form submission
guestForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const isAttending = document.querySelector('input[name="attending"]:checked').value === 'yes';
    const guestCount = isAttending ? document.getElementById('guestCount').value : 0;
    const giftMethod = document.getElementById('giftOption').value !== 'none' ? document.getElementById('giftOption').value : null;
    const giftMessage = document.getElementById('giftMessage').value;

    // Set loading state on button
    submitButton.classList.add('btn-loading');
    submitButton.disabled = true;
    showOverlay('Processing your RSVP...');

    try {
        // Check for existing RSVP
        const { data: existing, error: existingError } = await supabase
            .from('wedding_guests')
            .select('*')
            .eq('email', email);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
            hideOverlay();
            showOverlay('You have already submitted an RSVP with this email address.', false);
            setTimeout(hideOverlay, 3000);
            submitButton.classList.remove('btn-loading');
            submitButton.disabled = false;
            return;
        }

        // Insert new RSVP
        const { data, error } = await supabase
            .from('wedding_guests')
            .insert([
            {
                name: fullName,
                email: email,
                phone: phone,
                is_attending: isAttending,
                guest_count: guestCount,
                gift_method: giftMethod,
                gift_message: giftMessage,
                submitted_at: new Date()
            }
        ]);

        if (error) throw error;

        // Show thank you message
        hideOverlay();
        rsvpForm.style.display = 'none';
        thankYou.style.display = 'block';

    } catch (error) {
        console.error('Error submitting RSVP:', error);
        hideOverlay();
        showOverlay('There was an error submitting your RSVP. Please try again.', false);
        setTimeout(hideOverlay, 3000);
        submitButton.classList.remove('btn-loading');
        submitButton.disabled = false;
    }
});

// Trigger initial change event to load any default values
giftOption.dispatchEvent(new Event('change'));