const axios = require('axios');
const xml2js = require('xml2js');

/**
 * Check if an asset is active based on its status, name, and ID
 */
function isAssetActive(asset) {
    // Check if asset has inactive indicators in name or ID
    const name = (asset.name || asset.assetName || '').toLowerCase();
    const id = (asset.id || asset.assetId || '').toLowerCase();
    
    // Check for inactive keywords in name or ID
    const inactiveKeywords = ['inactive', 'disabled', 'offline', 'maintenance', 'out_of_service', 'decommissioned'];
    
    for (const keyword of inactiveKeywords) {
        if (name.includes(keyword) || id.includes(keyword)) {
            return false;
        }
    }
    
    // Check if status indicates inactive
    const status = (asset.status || '').toLowerCase();
    const inactiveStatuses = ['inactive', 'disabled', 'offline', 'maintenance', 'out_of_service', 'decommissioned'];
    
    return !inactiveStatuses.includes(status);
}

/**
 * Test Spireon GPS provider connection
 */
async function testSpireonConnection(credentials) {
    const maxRetries = 2;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Testing Spireon connection... (Attempt ${attempt}/${maxRetries})`);
            console.log('Received credentials:', JSON.stringify(credentials, null, 2));
            
            const { apiKey, username, password, nspireId } = credentials;
            const baseURL = credentials.baseURL || 'https://services.spireon.com/v0/rest';
            
            if (!apiKey || !username || !password || !nspireId) {
                const missing = [];
                if (!apiKey) missing.push('API Key');
                if (!username) missing.push('Username');
                if (!password) missing.push('Password');
                if (!nspireId) missing.push('Nspire ID');
                throw new Error(`Missing required Spireon credentials: ${missing.join(', ')}`);
            }

            const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
            
            // Use the same endpoint as the working simpler version
            const response = await axios.get(`${baseURL}/assets`, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'X-Nspire-AppToken': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            const assets = response.data.content || response.data || [];
            
            console.log(`✅ Spireon test successful: ${assets.length} total assets found`);
            
            // Transform assets to a consistent format and filter out inactive units
            const transformedAssets = assets
                .filter(asset => {
                    const isActive = isAssetActive(asset);
                    if (!isActive) {
                        console.log(`🔍 Asset ${asset.id || asset.assetId}: INACTIVE due to name/ID containing "inactive"`);
                    }
                    return isActive;
                })
                .map(asset => {
                    // Spireon uses 'lastLocation' for location data
                    const location = asset.lastLocation || {};
                    
                    // Extract coordinates - Spireon uses 'lat' and 'lng'
                    const latitude = location.lat || null;
                    const longitude = location.lng || null;
                    
                    // Format address from nested structure
                    const address = location.address ? 
                        `${location.address.line1 || ''}, ${location.address.city || ''}, ${location.address.stateOrProvince || ''} ${location.address.postalCode || ''}`.trim() :
                        null;
                    
                    // Use Spireon's timestamp field
                    const timestamp = asset.locationLastReported || new Date().toISOString();
                    
                    const transformedAsset = {
                        id: asset.id || asset.assetId,
                        name: asset.name || asset.assetName || asset.id,
                        status: asset.status || 'active',
                        // Vehicle details
                        vin: asset.vin || null,
                        make: asset.make || null,
                        model: asset.model || null,
                        year: asset.year || null,
                        plate: asset.plate || null,
                        // Location data
                        location: {
                            latitude: latitude,
                            longitude: longitude,
                            address: address,
                            timestamp: timestamp
                        }
                    };
                    
                    return transformedAsset;
                });
            
            const filteredOutCount = assets.length - transformedAssets.length;
            console.log(`✅ Spireon filtered: ${transformedAssets.length} active assets (${filteredOutCount} inactive assets filtered out)`);
            
            return {
                success: true,
                trailerCount: transformedAssets.length,
                assets: transformedAssets,
                message: `Connected successfully. Found ${transformedAssets.length} active assets (${assets.length} total).`
            };
        } catch (error) {
            console.error(`❌ Spireon test failed (Attempt ${attempt}/${maxRetries}):`, error.message);
            lastError = error;
            
            // If this is not the last attempt, wait a bit before retrying
            if (attempt < maxRetries) {
                console.log(`⏳ Waiting 2 seconds before retry...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }
        }
    }
    
    // If we get here, all attempts failed
    console.error('❌ All Spireon test attempts failed');
    
    let errorMessage = 'Connection failed';
    if (lastError.response) {
        if (lastError.response.status === 401) {
            errorMessage = 'Invalid credentials - check username, password, and API key';
        } else if (lastError.response.status === 403) {
            errorMessage = 'Access denied - check API permissions and Nspire ID';
        } else {
            errorMessage = `HTTP ${lastError.response.status}: ${lastError.response.statusText}`;
        }
    } else if (lastError.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused - check API URL';
    } else if (lastError.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout - the API took too long to respond. This may be due to network issues or high API load. Please try again.';
    } else if (lastError.message && lastError.message.includes('timeout')) {
        errorMessage = 'Request timeout - the Spireon API is taking longer than expected to respond. Please try again later.';
    } else {
        errorMessage = lastError.message;
    }
    
    return {
        success: false,
        error: errorMessage
    };
}

/**
 * Test SkyBitz GPS provider connection
 */
async function testSkyBitzConnection(credentials) {
    try {
        console.log('Testing SkyBitz connection...');
        console.log('Received credentials:', JSON.stringify(credentials, null, 2));
        
        const { username, password } = credentials;
        const baseURL = credentials.baseURL || 'https://xml.skybitz.com:9443';
        
        if (!username || !password) {
            const missing = [];
            if (!username) missing.push('Username');
            if (!password) missing.push('Password');
            throw new Error(`Missing required SkyBitz credentials: ${missing.join(', ')}`);
        }

        const params = new URLSearchParams({
            customer: username,
            password: password,
            assetid: 'ALL',
            version: '2.67'
        });
        
        const url = `${baseURL}/QueryPositions?${params.toString()}`;
        
        const response = await axios.get(url, {
            timeout: 20000,
            headers: {
                'User-Agent': 'GPS-Fleet-Management/1.0'
            }
        });

        const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: true
        });

        const result = await parser.parseStringPromise(response.data);
        
        if (result.skybitz && result.skybitz.e && result.skybitz.e !== '0') {
            throw new Error(`SkyBitz API Error Code: ${result.skybitz.e}`);
        }

        let trailerCount = 0;
        let assets = [];
        if (result.skybitz && result.skybitz.gls) {
            const glsData = Array.isArray(result.skybitz.gls) 
                ? result.skybitz.gls 
                : [result.skybitz.gls];
            trailerCount = glsData.length;
            
            // Debug: Log all statuses to see what we're getting
            console.log('🔍 All asset statuses from SkyBitz:');
            const allStatuses = glsData.map(asset => asset.status || 'no-status');
            console.log('🔍 Statuses:', allStatuses);
            
            // Transform SkyBitz assets to consistent format and filter out inactive units
            assets = glsData
                .filter(asset => {
                    const isActive = isAssetActive(asset);
                    
                    // Debug: Log filtering decision
                    console.log(`🔍 Asset ${asset.id || asset.assetId}: name="${asset.name || asset.assetName}", status="${asset.status}" -> isActive=${isActive}`);
                    
                    return isActive;
                })
                .map(asset => {
                    const location = asset.location || {};
                    return {
                        id: asset.id || asset.assetId,
                        name: asset.name || asset.assetName || asset.id,
                        status: asset.status || 'active',
                        location: {
                            latitude: location.latitude || location.lat || null,
                            longitude: location.longitude || location.lng || null,
                            address: location.address || location.formattedAddress || null,
                            timestamp: location.timestamp || location.lastUpdate || new Date().toISOString()
                        }
                    };
                });
        }
        
        console.log(`✅ SkyBitz test successful: ${glsData.length} total assets found`);
        const filteredOutCount = glsData.length - assets.length;
        console.log(`✅ SkyBitz filtered: ${assets.length} active assets (${filteredOutCount} inactive assets filtered out)`);
        
        return {
            success: true,
            trailerCount: assets.length,
            assets: assets,
            message: `Connected successfully. Found ${assets.length} active assets (${glsData.length} total).`
        };
    } catch (error) {
        console.error('❌ SkyBitz test failed:', error.message);
        
        let errorMessage = 'Connection failed';
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Invalid credentials - check username and password';
            } else if (error.response.status === 403) {
                errorMessage = 'Access denied - check account permissions';
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused - check API URL';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout - check network connectivity';
        } else {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Test Samsara GPS provider connection
 */
async function testSamsaraConnection(credentials) {
    try {
        console.log('Testing Samsara connection...');
        console.log('Received credentials:', JSON.stringify(credentials, null, 2));
        
        const { apiToken, apiUrl } = credentials;
        
        if (!apiToken || !apiUrl) {
            const missing = [];
            if (!apiToken) missing.push('API Token');
            if (!apiUrl) missing.push('API URL');
            throw new Error(`Missing required Samsara credentials: ${missing.join(', ')}`);
        }

        // Test the connection by fetching vehicles/assets
        const response = await axios.get(`${apiUrl}/fleet/vehicles`, {
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 15000
        });

        const vehicles = response.data.data || [];
        const trailers = vehicles.filter(vehicle => 
            vehicle.vehicleType === 'trailer' || 
            vehicle.name.toLowerCase().includes('trailer')
        );
        const trailerCount = trailers.length;
        
        // Debug: Log all statuses to see what we're getting
        console.log('🔍 All vehicle statuses from Samsara:');
        const allStatuses = trailers.map(vehicle => vehicle.status || 'no-status');
        console.log('🔍 Statuses:', allStatuses);
        
        // Transform Samsara trailers to consistent format and filter out inactive units
        const assets = trailers
            .filter(vehicle => {
                const isActive = isAssetActive(vehicle);
                
                // Debug: Log filtering decision
                console.log(`🔍 Vehicle ${vehicle.id || vehicle.assetId}: name="${vehicle.name || vehicle.assetName}", status="${vehicle.status}" -> isActive=${isActive}`);
                
                return isActive;
            })
            .map(vehicle => {
                const location = vehicle.location || vehicle.gpsLocation || {};
                return {
                    id: vehicle.id || vehicle.assetId,
                    name: vehicle.name || vehicle.assetName || vehicle.id,
                    status: vehicle.status || 'active',
                    location: {
                        latitude: location.latitude || location.lat || null,
                        longitude: location.longitude || location.lng || null,
                        address: location.address || location.formattedAddress || null,
                        timestamp: location.timestamp || location.lastUpdate || new Date().toISOString()
                    }
                };
            });
        
        console.log(`✅ Samsara test successful: ${vehicles.length} vehicles found, ${trailers.length} total trailers`);
        const filteredOutCount = trailers.length - assets.length;
        console.log(`✅ Samsara filtered: ${assets.length} active trailers (${filteredOutCount} inactive trailers filtered out)`);
        
        return {
            success: true,
            trailerCount: assets.length,
            assets: assets,
            message: `Connected successfully. Found ${assets.length} active trailers (${trailers.length} total trailers).`
        };
    } catch (error) {
        console.error('❌ Samsara test failed:', error.message);
        
        let errorMessage = 'Connection failed';
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Invalid API token - check your Samsara API credentials';
            } else if (error.response.status === 403) {
                errorMessage = 'Access denied - check API permissions';
            } else if (error.response.status === 404) {
                errorMessage = 'API endpoint not found - check API URL';
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused - check API URL';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout - check network connectivity';
        } else {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Test GPS provider connection based on provider type
 */
async function testGPSProviderConnection(providerType, credentials) {
    switch (providerType) {
        case 'spireon':
            return await testSpireonConnection(credentials);
        case 'skybitz':
            return await testSkyBitzConnection(credentials);
        case 'samsara':
            return await testSamsaraConnection(credentials);
        default:
            return {
                success: false,
                error: `Unsupported provider type: ${providerType}`
            };
    }
}

module.exports = {
    testSpireonConnection,
    testSkyBitzConnection,
    testSamsaraConnection,
    testGPSProviderConnection,
    isAssetActive
}; 
