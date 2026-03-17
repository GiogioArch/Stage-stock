-- ============================================================
-- FIX URGENCES SÉCURITÉ TRANSACTIONS — Stage Stock
-- ============================================================

-- Procédure stockée pour traiter une vente de manière atomique
CREATE OR REPLACE FUNCTION process_sale(
  p_org_id UUID,
  p_event_id UUID,
  p_sale_number TEXT,
  p_payment_method TEXT,
  p_total_amount NUMERIC,
  p_items_count INTEGER,
  p_sold_by UUID,
  p_items JSONB -- Array of { product_id, variant, quantity, unit_price, line_total }
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_loc_id UUID;
  v_qty_needed INTEGER;
  v_qty_available INTEGER;
  v_qty_to_deduct INTEGER;
BEGIN
  -- 1. Créer la vente
  INSERT INTO sales (org_id, event_id, sale_number, payment_method, total_amount, items_count, sold_by)
  VALUES (p_org_id, p_event_id, p_sale_number, p_payment_method, p_total_amount, p_items_count, p_sold_by)
  RETURNING id INTO v_sale_id;

  -- 2. Traiter chaque article
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insérer la ligne de vente
    INSERT INTO sale_items (org_id, sale_id, product_id, variant, quantity, unit_price, line_total)
    VALUES (
      p_org_id, 
      v_sale_id, 
      (v_item->>'product_id')::UUID, 
      v_item->>'variant', 
      (v_item->>'quantity')::INTEGER, 
      (v_item->>'unit_price')::NUMERIC, 
      (v_item->>'line_total')::NUMERIC
    );

    -- Décrémenter le stock (FIFO sur les emplacements)
    v_qty_needed := (v_item->>'quantity')::INTEGER;
    
    FOR v_loc_id, v_qty_available IN 
      SELECT id, quantity FROM stock 
      WHERE product_id = (v_item->>'product_id')::UUID AND quantity > 0 
      ORDER BY quantity DESC
    LOOP
      IF v_qty_needed <= 0 THEN
        EXIT;
      END IF;

      v_qty_to_deduct := LEAST(v_qty_needed, v_qty_available);
      
      UPDATE stock 
      SET quantity = quantity - v_qty_to_deduct 
      WHERE id = v_loc_id;
      
      v_qty_needed := v_qty_needed - v_qty_to_deduct;
    END LOOP;
  END LOOP;

  RETURN v_sale_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, la transaction est automatiquement annulée par PostgreSQL
    RAISE EXCEPTION 'Erreur lors du traitement de la vente: %', SQLERRM;
END;
$$;
