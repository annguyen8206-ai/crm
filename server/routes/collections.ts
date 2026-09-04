import type { Express } from 'express';
import { dbStore } from '../store';
import { hasPerm, isAdmin, COLLECTION_WRITE_PERM } from '../rbac';

const COLLECTION_NAMES = new Set([
  'branches', 'b2bContracts', 'b2cDeals', 'campaigns', 'automationRules',
  'referrals', 'partners', 'partnerPayouts', 'interactions', 'segments',
  'medicalServices', 'medicalPackages', 'doctors'
  // NB: `messagingOptOut` is intentionally NOT here — it is written only via the
  // dedicated /api/messaging/opt-out route, never the generic collections PUT.
]);

/** Generic key→array store for front-end modules without a dedicated typed table. */
export function registerCollectionRoutes(app: Express): void {
  app.get('/api/collections', (req, res) => {
    res.json({ collections: dbStore.collections });
  });

  app.get('/api/collections/:name', (req, res) => {
    const { name } = req.params;
    if (!COLLECTION_NAMES.has(name)) return res.status(404).json({ error: `Collection "${name}" không hợp lệ` });
    res.json({ name, items: dbStore.collections[name] || [] });
  });

  app.put('/api/collections/:name', (req, res) => {
    const { name } = req.params;
    if (!COLLECTION_NAMES.has(name)) return res.status(404).json({ error: `Collection "${name}" không hợp lệ` });
    const needed = COLLECTION_WRITE_PERM[name];
    if (needed && !(needed === 'canAdminister' ? isAdmin(req.authUser?.role) : hasPerm(req.authUser?.role, needed))) {
      return res.status(403).json({ error: `Vai trò của bạn không được phép sửa "${name}"` });
    }
    const items = (req.body && req.body.items) ?? req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Payload phải là mảng hoặc { items: [...] }' });
    dbStore.collections[name] = items;
    res.json({ success: true, name, count: items.length });
  });
}
