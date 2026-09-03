import { supabase } from '../lib/supabaseClient.js';

export const requireAuth = async (req, res, next) => {
    try {
        let token = req.headers.authorization?.split(' ')[1];
        
        // Check query param for SSE
        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // --- GUEST TRIAL LOGIC ---
        if (token === 'guest') {
            // Bypass Supabase auth for the single guest trial.
            // In a production app you might want to log IP addresses here to prevent abuse, 
            // but for now, we rely on frontend localStorage to block repeated guest access.
            req.user = { id: 'guest', role: 'guest' };
            req.userData = { plan: 'free', llm_calls_count: 0 };
            return next();
        }
        // -------------------------

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // No quota enforcement for signed-in users — incrementUsage() still
        // tracks llm_calls_count per run for analytics.
        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};

export const incrementUsage = async (userId) => {
    try {
        // Increment the usage counter in a simple way
        // Alternatively, you could use an RPC call: supabase.rpc('increment_llm_calls', { user_id: userId })
        const { data: userData, error: dbError } = await supabase
            .from('users')
            .select('llm_calls_count')
            .eq('id', userId)
            .single();

        if (!dbError && userData) {
            await supabase
                .from('users')
                .update({ llm_calls_count: userData.llm_calls_count + 1 })
                .eq('id', userId);
        }
    } catch (err) {
        console.error('Failed to increment usage:', err);
    }
};
