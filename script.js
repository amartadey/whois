document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        searchInput: document.getElementById('search-input'),
        searchBtn: document.getElementById('search-btn'),
        clearBtn: document.getElementById('clear-btn'),
        tabButtons: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        themeToggle: document.getElementById('theme-icon'),
        exportBtn: document.getElementById('export-btn'),
        shareBtn: document.getElementById('share-btn'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        historyList: document.getElementById('history-list'),
        similarDomains: document.getElementById('similar-domains'),
        similarDomainsList: document.getElementById('similar-domains-list'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalBody: document.getElementById('modal-body'),
        modalClose: document.getElementById('modal-close'),
        notification: document.getElementById('notification'),
        notificationMessage: document.querySelector('.notification-message'),
        notificationClose: document.querySelector('.notification-close'),
        aboutLink: document.getElementById('about-link'),
        privacyLink: document.getElementById('privacy-link')
    };

    // State
    let currentResults = null;
    let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];

    // API Configuration
    const API_KEY = 'at_bTlx6fnzlQgSE5uksBH3MZodiRyzU';
    const WHOIS_API = 'https://www.whoisxmlapi.com/whoisserver/WhoisService';

    // Hosting provider mapping
    const hostingProviders = {
        'dns-parking.com': 'Hostinger',
        'nsone.net': 'Big Rock',
        'secureserver.net': 'GoDaddy',
        'cloudflare.com': 'Cloudflare',
        'bluehost.com': 'Bluehost',
        'dreamhost.com': 'DreamHost',
        'siteground.net': 'SiteGround',
        'digitalocean.com': 'DigitalOcean',
        'linode.com': 'Linode',
        'awsdns': 'Amazon Web Services (AWS)',
        'hostgator.com': 'HostGator',
        'namecheap.com': 'Namecheap',
        'wpengine.com': 'WP Engine',
        'liquidweb.com': 'Liquid Web',
        'ovh.net': 'OVHcloud',
        'hetzner.de': 'Hetzner',
        'ionos.com': 'IONOS',
        'a2hosting.com': 'A2 Hosting',
        'inmotionhosting.com': 'InMotion Hosting',
        'fastly.net': 'Fastly',
        'verisign.com': 'VeriSign',
        'rackspace.com': 'Rackspace',
        'google.com': 'Google Cloud',
        'azure-dns': 'Microsoft Azure',
        'vultr.com': 'Vultr',
        'kinsta.com': 'Kinsta',
        'pair.com': 'pair Networks',
        'sucuri.net': 'Sucuri',
        'nsone.net': 'NS1',
        'dynect.net': 'Oracle Dyn',
        'he.net': 'Hurricane Electric',
        'herosite.pro': 'Miles Web',
        'ventraip.com.au': 'VentraIP',
        'hosting-australia.com': 'Hosting Australia',
        'netregistry.com.au': 'Netregistry',
        'digitalpacific.com.au': 'Digital Pacific',
        'webhostbox.net': 'Bigrock - The Endurance International Group, Inc.'
    };

    // Event Listeners
    elements.searchBtn.addEventListener('click', () => performSearch(elements.searchInput.value.trim()));
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch(elements.searchInput.value.trim());
    });
    elements.searchInput.addEventListener('input', toggleClearButton);
    elements.clearBtn.addEventListener('click', clearSearch);
    elements.tabButtons.forEach(btn => btn.addEventListener('click', (e) => switchTab(e)));
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.exportBtn.addEventListener('click', exportResults);
    elements.shareBtn.addEventListener('click', shareResults);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    elements.modalClose.addEventListener('click', closeModal);
    elements.notificationClose.addEventListener('click', hideNotification);
    elements.aboutLink.addEventListener('click', showAbout);
    elements.privacyLink.addEventListener('click', showPrivacy);

    // Initialize
    loadHistory();
    toggleClearButton();

    async function performSearch(domain) {
        if (!validateDomain(domain)) {
            showNotification('Please enter a valid domain name', 'error');
            return;
        }

        showLoading(true);
        try {
            const whoisData = await fetchWhoisData(domain);
            currentResults = { domain, whois: whoisData };
            updateHistory(domain, whoisData);
            displayResults(whoisData, 'whois');
            displayResults(whoisData, 'dns');
            checkAvailability(domain);
            suggestSimilarDomains(domain);
            enableFeatureButtons();
            switchToTab('whois');
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function fetchWhoisData(domain) {
        const apiUrl = `${WHOIS_API}?apiKey=${API_KEY}&domainName=${encodeURIComponent(domain)}&outputFormat=JSON`;
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (data.ErrorMessage) {
            throw new Error(data.ErrorMessage.msg || 'Unknown API error');
        }

        return data.WhoisRecord;
    }

    function formatDate(dateStr) {
        if (!dateStr || dateStr === 'N/A') return 'N/A';
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours() % 12 || 12;
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
        return `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;
    }

    function displayResults(data, type) {
        const panel = document.getElementById(`${type}-results`);
        panel.innerHTML = '';

        if (type === 'whois') {
            panel.innerHTML = formatWhoisData(data);
        } else if (type === 'dns') {
            panel.innerHTML = formatDNSData(data);
        }
    }

    function formatWhoisData(data) {
        const registrant = data.registrant || {};
        const admin = data.administrativeContact || {};
        const tech = data.technicalContact || {};
        const dates = data.registryData || {};
        return `
            <div class="results-section">
                <h3 class="section-title"><i class="fas fa-id-card"></i> Domain Information</h3>
                <div class="info-row"><span class="info-label">Domain Name:</span><span class="info-value">${data.domainName || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Registrar:</span><span class="info-value">${data.registrarName || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Status:</span><span class="info-value">${data.status || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Created:</span><span class="info-value">${formatDate(dates.createdDate)}</span></div>
                <div class="info-row"><span class="info-label">Updated:</span><span class="info-value">${formatDate(dates.updatedDate)}</span></div>
                <div class="info-row"><span class="info-label">Expires:</span><span class="info-value">${formatDate(dates.expiresDate)}</span></div>
            </div>
            <div class="results-section">
                <h3 class="section-title"><i class="fas fa-user"></i> Registrant Contact</h3>
                <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${registrant.name || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Organization:</span><span class="info-value">${registrant.organization || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${registrant.email || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${registrant.telephone || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Street:</span><span class="info-value">${registrant.street1 || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">City:</span><span class="info-value">${registrant.city || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Country:</span><span class="info-value">${registrant.country || 'N/A'}</span></div>
            </div>
            <div class="results-section">
                <h3 class="section-title"><i class="fas fa-user-tie"></i> Administrative Contact</h3>
                <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${admin.name || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${admin.email || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${admin.telephone || 'N/A'}</span></div>
            </div>
            <div class="results-section">
                <h3 class="section-title"><i class="fas fa-user-cog"></i> Technical Contact</h3>
                <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${tech.name || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${tech.email || 'N/A'}</span></div>
                <div class="info-row"><span class="info-label">Phone:</span><span class="info-value">${tech.telephone || 'N/A'}</span></div>
            </div>
        `;
    }

    function formatDNSData(data) {
        const nameServers = data.registryData?.nameServers?.hostNames || [];
        const hostingProvider = detectHostingProvider(nameServers);
        return `
            <div class="results-section">
                <h3 class="section-title"><i class="fas fa-server"></i> DNS Information</h3>
                <div class="info-row"><span class="info-label">Hosting Provider:</span><span class="info-value">${hostingProvider || 'Unknown'}</span></div>
                ${nameServers.length ? nameServers.map(ns => `
                    <div class="dns-record">
                        <div class="info-row"><span class="info-label">Name Server:</span><span class="info-value">${ns}</span></div>
                    </div>
                `).join('') : `
                    <div class="dns-record">
                        <div class="info-row"><span class="info-label">Status:</span><span class="info-value">No name server information available</span></div>
                    </div>
                `}
            </div>
        `;
    }

    function detectHostingProvider(nameServers) {
        if (!nameServers || !nameServers.length) return null;
        for (const ns of nameServers) {
            for (const [domain, provider] of Object.entries(hostingProviders)) {
                if (ns.toLowerCase().includes(domain)) {
                    return provider;
                }
            }
        }
        return null;
    }

    function checkAvailability(domain) {
        const panel = document.getElementById('availability-results');
        const isRegistered = currentResults.whois.registryData?.createdDate;
        panel.innerHTML = `
            <div class="availability-status ${isRegistered ? 'status-taken' : 'status-available'}">
                <i class="fas fa-${isRegistered ? 'times' : 'check'}-circle"></i>
                <span>${domain} is ${isRegistered ? 'registered' : 'available'}</span>
            </div>
        `;
    }

    function suggestSimilarDomains(domain) {
        const tldList = ['.com', '.org', '.net', '.co', '.io'];
        const [name] = domain.split('.');
        const suggestions = tldList
            .filter(tld => tld !== '.' + domain.split('.').pop())
            .map(tld => `${name}${tld}`);

        elements.similarDomains.classList.remove('hidden');
        elements.similarDomainsList.innerHTML = suggestions.map(suggestion => `
            <div class="domain-suggestion">
                <span class="domain-name">${suggestion}</span>
                <button class="domain-action" onclick="document.getElementById('search-input').value = '${suggestion}';">
                    <i class="fas fa-search"></i>
                </button>
            </div>
        `).join('');
    }

    function switchTab(e) {
        const tab = e.target.dataset.tab;
        elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        elements.tabContents.forEach(content => content.classList.remove('active'));
        e.target.classList.add('active');
        const content = document.getElementById(`${tab}-content`);
        content.classList.add('active');

        if (tab === 'history') {
            loadHistory();
        } else if (currentResults) {
            displayTabContent(tab);
        }
    }

    function switchToTab(tabName) {
        elements.tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        elements.tabContents.forEach(content => {
            if (content.id === `${tabName}-content`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
        if (tabName !== 'history' && currentResults) {
            displayTabContent(tabName);
        }
    }

    function displayTabContent(tab) {
        if (tab === 'whois') {
            displayResults(currentResults.whois, 'whois');
        } else if (tab === 'dns') {
            displayResults(currentResults.whois, 'dns');
        } else if (tab === 'availability') {
            checkAvailability(currentResults.domain);
        }
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        elements.themeToggle.classList.toggle('fa-sun');
        elements.themeToggle.classList.toggle('fa-moon');
        localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    }

    function exportResults() {
        const blob = new Blob([JSON.stringify(currentResults.whois, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentResults.domain}-whois.json`;
        a.click();
        URL.revokeObjectURL(url);
        showNotification('Results exported successfully', 'success');
    }

    function shareResults() {
        if (navigator.share) {
            const formattedData = formatShareData(currentResults.whois);
            navigator.share({
                title: `WHOIS Data for ${currentResults.domain}`,
                text: formattedData,
            })
            .then(() => showNotification('Shared successfully', 'success'))
            .catch((error) => showNotification('Error sharing: ' + error.message, 'error'));
        } else {
            showNotification('Web Share API not supported in this browser', 'warning');
        }
    }

    function formatShareData(data) {
        const registrant = data.registrant || {};
        const admin = data.administrativeContact || {};
        const tech = data.technicalContact || {};
        const dates = data.registryData || {};
        const nameServers = dates.nameServers?.hostNames || [];
        const hostingProvider = detectHostingProvider(nameServers);

        return `
Domain: ${data.domainName || 'N/A'}
Registrar: ${data.registrarName || 'N/A'}
Status: ${data.status || 'N/A'}
Created: ${formatDate(dates.createdDate)}
Updated: ${formatDate(dates.updatedDate)}
Expires: ${formatDate(dates.expiresDate)}

Registrant:
- Name: ${registrant.name || 'N/A'}
- Organization: ${registrant.organization || 'N/A'}
- Email: ${registrant.email || 'N/A'}
- Phone: ${registrant.telephone || 'N/A'}
- Address: ${registrant.street1 || 'N/A'}, ${registrant.city || 'N/A'}, ${registrant.country || 'N/A'}

Administrative Contact:
- Name: ${admin.name || 'N/A'}
- Email: ${admin.email || 'N/A'}
- Phone: ${admin.telephone || 'N/A'}

Technical Contact:
- Name: ${tech.name || 'N/A'}
- Email: ${tech.email || 'N/A'}
- Phone: ${tech.telephone || 'N/A'}

DNS Information:
- Hosting Provider: ${hostingProvider || 'Unknown'}
${nameServers.length ? nameServers.map(ns => `- Name Server: ${ns}`).join('\n') : '- No name servers available'}
        `.trim();
    }

    function updateHistory(domain, whoisData) {
        if (!searchHistory.includes(domain)) {
            searchHistory.unshift(domain);
            searchHistory = searchHistory.slice(0, 10);
            localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
            localStorage.setItem(`domainData_${domain}`, JSON.stringify(whoisData));
        }
    }

    function loadHistory() {
        elements.historyList.innerHTML = searchHistory.map(domain => {
            const whoisData = JSON.parse(localStorage.getItem(`domainData_${domain}`));
            const registrar = whoisData?.registrarName || 'N/A';
            const createdDate = whoisData?.registryData?.createdDate ? formatDate(whoisData.registryData.createdDate) : 'N/A';
            return `
                <div class="history-item" onclick="loadFromHistory('${domain}')">
                    <div class="history-domain">
                        <i class="fas fa-globe"></i>
                        <div>
                            <strong>${domain}</strong>
                            <div>Registrar: ${registrar}</div>
                            <div>Created: ${createdDate}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function loadFromHistory(domain) {
        const storedData = JSON.parse(localStorage.getItem(`domainData_${domain}`));
        if (storedData) {
            currentResults = { domain, whois: storedData };
            elements.searchInput.value = domain;
            displayResults(storedData, 'whois');
            displayResults(storedData, 'dns');
            checkAvailability(domain);
            suggestSimilarDomains(domain);
            enableFeatureButtons();
            switchToTab('whois');
        }
    }

    function clearHistory() {
        searchHistory.forEach(domain => {
            localStorage.removeItem(`domainData_${domain}`);
        });
        searchHistory = [];
        localStorage.removeItem('searchHistory');
        loadHistory();
        showNotification('Search history cleared', 'success');
        currentResults = null;
        clearResults();
    }

    function clearResults() {
        document.getElementById('whois-results').innerHTML = '';
        document.getElementById('dns-results').innerHTML = '';
        document.getElementById('availability-results').innerHTML = '';
        elements.similarDomains.classList.add('hidden');
        elements.exportBtn.disabled = true;
        elements.shareBtn.disabled = true;
    }

    function toggleClearButton() {
        elements.clearBtn.classList.toggle('hidden', !elements.searchInput.value);
    }

    function clearSearch() {
        elements.searchInput.value = '';
        toggleClearButton();
        elements.searchInput.focus();
    }

    function showLoading(show) {
        document.getElementById('loading-overlay').classList.toggle('hidden', !show);
    }

    function showNotification(message, type) {
        elements.notificationMessage.textContent = message;
        elements.notification.className = `notification ${type}`;
        elements.notification.classList.remove('hidden');
        setTimeout(hideNotification, 5000);
    }

    function hideNotification() {
        elements.notification.classList.add('hidden');
    }

    function showModal(title, content) {
        elements.modalTitle.textContent = title;
        elements.modalBody.innerHTML = content;
        elements.modal.classList.remove('hidden');
    }

    function closeModal() {
        elements.modal.classList.add('hidden');
    }

    function showAbout(e) {
        e.preventDefault();
        showModal('About DomainSleuth', `
            <p>DomainSleuth is a powerful domain lookup tool that provides comprehensive WHOIS information about domains.</p>
            <p>Version: 1.0.0</p>
            <p>Powered by WhoisXML API</p>
            <p>Hosted on GitHub Pages</p>
        `);
    }

    function showPrivacy(e) {
        e.preventDefault();
        showModal('Privacy Policy', `
            <p>Your privacy is important to us. DomainSleuth only stores search history locally in your browser and does not transmit any personal information to our servers.</p>
            <p>API requests are made directly to WhoisXML API services and are subject to their privacy policies.</p>
        `);
    }

    function validateDomain(domain) {
        const regex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)\.[A-Za-z]{2,}$/;
        return regex.test(domain);
    }

    function enableFeatureButtons() {
        elements.exportBtn.disabled = false;
        elements.shareBtn.disabled = false;
    }

    // Load saved theme
    if (localStorage.getItem('theme') === 'light') {
        toggleTheme();
    }
});