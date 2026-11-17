import type { Express } from 'express';
import { dbStore } from '../store';
import { requirePerm } from '../rbac';
import { buildOrderItems } from '../commerce';
import { evaluatePromotion, localYmd, promotionUses, sanitizePromotion, type PromotionRecord } from '../promotions';

const withUsage = (p: PromotionRecord) => ({ ...p, used: promotionUses(p.code, dbStore.orders) });

/** Promotion programs (CTKM): admin CRUD + per-basket evaluation for the order form. */
export function registerPromotionRoutes(app: Express): void {
  app.get('/api/promotions', (_req, res) => {
    const today = localYmd();
    const rows = [...dbStore.promotions]
      .sort((a, b) => (b.endDate >= today ? 1 : 0) - (a.endDate >= today ? 1 : 0) || b.startDate.localeCompare(a.startDate))
      .map(withUsage);
    res.json({ promotions: rows, total: rows.length });
  });

  app.post('/api/promotions', requirePerm('canManageMarketing'), (req, res) => {
    const r = sanitizePromotion(req.body);
    if ('error' in r) return res.status(400).json({ error: r.error });
    if (dbStore.promotions.some(p => p.code === r.value.code)) return res.status(409).json({ error: `Mã ${r.value.code} đã tồn tại` });
    for (const id of [r.value.buyProductId, r.value.giftProductId, ...(r.value.productIds || [])].filter(Boolean)) {
      if (!dbStore.products.some(p => p.id === id)) return res.status(400).json({ error: `Không tìm thấy sản phẩm ${id}` });
    }
    const promo: PromotionRecord = { id: `promo-${Date.now()}`, ...r.value, createdAt: new Date().toISOString(), createdBy: req.authUser?.name };
    dbStore.promotions.unshift(promo);
    res.status(201).json({ success: true, promotion: withUsage(promo) });
  });

  app.put('/api/promotions/:id', requirePerm('canManageMarketing'), (req, res) => {
    const idx = dbStore.promotions.findIndex(p => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Không tìm thấy chương trình' });
    const cur = dbStore.promotions[idx];
    // The code is what past orders reference — it cannot change once used.
    if (req.body?.code && String(req.body.code).toUpperCase() !== cur.code && promotionUses(cur.code, dbStore.orders) > 0) {
      return res.status(400).json({ error: 'Không đổi được mã của chương trình đã có đơn áp dụng' });
    }
    const r = sanitizePromotion(req.body, cur);
    if ('error' in r) return res.status(400).json({ error: r.error });
    if (r.value.code !== cur.code && dbStore.promotions.some(p => p.code === r.value.code)) return res.status(409).json({ error: `Mã ${r.value.code} đã tồn tại` });
    dbStore.promotions[idx] = { ...cur, ...r.value, updatedAt: new Date().toISOString() };
    res.json({ success: true, promotion: withUsage(dbStore.promotions[idx]) });
  });

  /**
   * Which promotions apply to this customer + basket, and what each gives.
   * Body: { customerId, items: [{ productId, quantity, discountPercent? }] }
   */
  app.post('/api/promotions/evaluate', (req, res) => {
    const c = dbStore.customers.find(x => x.id === req.body?.customerId);
    if (!c) return res.status(400).json({ error: 'Chưa chọn khách hàng hợp lệ' });
    let items;
    try {
      items = buildOrderItems(req.body?.items, dbStore.products, c.priceTier);
    } catch {
      return res.json({ applicable: [], notApplicable: [] });
    }
    const today = localYmd();
    const applicable: Array<{ code: string; name: string; discount: number; summary: string; giftItems: unknown[] }> = [];
    const notApplicable: Array<{ code: string; name: string; reason: string }> = [];
    for (const p of dbStore.promotions) {
      if (!p.active || today < p.startDate || today > p.endDate) continue; // not running — don't list
      const r = evaluatePromotion(p, { customer: c, items, products: dbStore.products, orders: dbStore.orders, today });
      if ('reason' in r) notApplicable.push({ code: p.code, name: p.name, reason: r.reason });
      else applicable.push({ code: p.code, name: p.name, discount: r.discount, summary: r.summary, giftItems: r.giftItems });
    }
    applicable.sort((a, b) => b.discount - a.discount);
    res.json({ applicable, notApplicable });
  });
}
