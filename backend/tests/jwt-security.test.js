/**
 * JWT Security Service Tests
 * Basic tests for the enhanced JWT security service
 */

const jwtSecurityService = require('../services/jwt-security');

// Mock request object for testing
const createMockRequest = (userAgent = 'test-agent', ip = '127.0.0.1') => ({
    headers: {
        'user-agent': userAgent
    },
    ip: ip,
    connection: {
        remoteAddress: ip
    }
});

describe('JWT Security Service', () => {
    let mockReq;

    beforeEach(() => {
        mockReq = createMockRequest();
    });

    describe('Token Creation', () => {
        test('should create access token with fingerprint', () => {
            const userData = {
                id: 'test-user-1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                tenantId: 'test-tenant',
                organizationRole: 'user'
            };

            const result = jwtSecurityService.createAccessToken(userData, mockReq);
            
            expect(result).toHaveProperty('token');
            expect(result).toHaveProperty('tokenId');
            expect(result).toHaveProperty('fingerprint');
            expect(typeof result.token).toBe('string');
            expect(typeof result.tokenId).toBe('string');
            expect(typeof result.fingerprint).toBe('string');
        });

        test('should create refresh token', () => {
            const userId = 'test-user-1';
            
            const result = jwtSecurityService.createRefreshToken(userId, mockReq);
            
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('refreshTokenId');
            expect(typeof result.refreshToken).toBe('string');
            expect(typeof result.refreshTokenId).toBe('string');
        });
    });

    describe('Token Verification', () => {
        test('should verify valid access token', async () => {
            const userData = {
                id: 'test-user-1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                tenantId: 'test-tenant',
                organizationRole: 'user'
            };

            const { token } = jwtSecurityService.createAccessToken(userData, mockReq);
            
            // Mock userManager.getUserProfile to return a valid user
            const originalGetUserProfile = require('../database/database-manager').userManager.getUserProfile;
            require('../database/database-manager').userManager.getUserProfile = jest.fn().mockResolvedValue({
                id: 'test-user-1',
                isActive: 1
            });

            try {
                const decoded = await jwtSecurityService.verifyAccessToken(token, mockReq);
                expect(decoded).toHaveProperty('id', 'test-user-1');
                expect(decoded).toHaveProperty('email', 'test@example.com');
            } finally {
                // Restore original function
                require('../database/database-manager').userManager.getUserProfile = originalGetUserProfile;
            }
        });

        test('should reject invalid token', async () => {
            const invalidToken = 'invalid.token.here';
            
            await expect(
                jwtSecurityService.verifyAccessToken(invalidToken, mockReq)
            ).rejects.toThrow('Invalid or expired token');
        });
    });

    describe('Token Revocation', () => {
        test('should revoke access token', () => {
            const userData = {
                id: 'test-user-1',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                tenantId: 'test-tenant',
                organizationRole: 'user'
            };

            const { token, tokenId } = jwtSecurityService.createAccessToken(userData, mockReq);
            
            // Token should be valid initially
            expect(jwtSecurityService.getTokenStats().activeFingerprints).toBeGreaterThan(0);
            
            // Revoke the token
            jwtSecurityService.revokeAccessToken(token);
            
            // Token should be blacklisted
            expect(jwtSecurityService.getTokenStats().blacklistedTokens).toBeGreaterThan(0);
        });

        test('should revoke refresh token', () => {
            const userId = 'test-user-1';
            const { refreshToken, refreshTokenId } = jwtSecurityService.createRefreshToken(userId, mockReq);
            
            // Refresh token should be active initially
            const initialCount = jwtSecurityService.getTokenStats().activeRefreshTokens;
            expect(initialCount).toBeGreaterThan(0);
            
            // Revoke the refresh token
            jwtSecurityService.revokeRefreshToken(refreshToken);
            
            // Refresh token should be removed
            const finalCount = jwtSecurityService.getTokenStats().activeRefreshTokens;
            expect(finalCount).toBe(initialCount - 1);
        });
    });

    describe('Token Statistics', () => {
        test('should return token statistics', () => {
            const stats = jwtSecurityService.getTokenStats();
            
            expect(stats).toHaveProperty('activeRefreshTokens');
            expect(stats).toHaveProperty('activeFingerprints');
            expect(stats).toHaveProperty('blacklistedTokens');
            expect(typeof stats.activeRefreshTokens).toBe('number');
            expect(typeof stats.activeFingerprints).toBe('number');
            expect(typeof stats.blacklistedTokens).toBe('number');
        });
    });

    describe('Fingerprint Generation', () => {
        test('should generate consistent fingerprints for same request', () => {
            const req1 = createMockRequest('test-agent', '127.0.0.1');
            const req2 = createMockRequest('test-agent', '127.0.0.1');
            
            const fp1 = jwtSecurityService.generateTokenFingerprint(req1);
            const fp2 = jwtSecurityService.generateTokenFingerprint(req2);
            
            expect(fp1).toBe(fp2);
        });

        test('should generate different fingerprints for different user agents', () => {
            const req1 = createMockRequest('chrome', '127.0.0.1');
            const req2 = createMockRequest('firefox', '127.0.0.1');
            
            const fp1 = jwtSecurityService.generateTokenFingerprint(req1);
            const fp2 = jwtSecurityService.generateTokenFingerprint(req2);
            
            expect(fp1).not.toBe(fp2);
        });

        test('should generate different fingerprints for different IPs', () => {
            const req1 = createMockRequest('test-agent', '127.0.0.1');
            const req2 = createMockRequest('test-agent', '192.168.1.1');
            
            const fp1 = jwtSecurityService.generateTokenFingerprint(req1);
            const fp2 = jwtSecurityService.generateTokenFingerprint(req2);
            
            expect(fp1).not.toBe(fp2);
        });
    });
});
