import { describe, it, expect } from 'vitest'
import { convertUnits } from '@/lib/engines/scaling'

describe('Unit of Measure Conversions', () => {
  describe('Mass Conversions', () => {
    describe('Kilogram Conversions', () => {
      it('should convert kg to g', () => {
        expect(convertUnits(1, 'kg', 'g')).toBe(1000)
        expect(convertUnits(2.5, 'kg', 'g')).toBe(2500)
        expect(convertUnits(0.5, 'kg', 'g')).toBe(500)
      })

      it('should convert kg to lb', () => {
        expect(convertUnits(1, 'kg', 'lb')).toBeCloseTo(2.20462, 4)
        expect(convertUnits(10, 'kg', 'lb')).toBeCloseTo(22.0462, 4)
        expect(convertUnits(50, 'kg', 'lb')).toBeCloseTo(110.231, 3)
      })

      it('should convert kg to oz', () => {
        expect(convertUnits(1, 'kg', 'oz')).toBeCloseTo(35.274, 3)
        expect(convertUnits(0.5, 'kg', 'oz')).toBeCloseTo(17.637, 3)
      })

      it('should keep kg to kg unchanged', () => {
        expect(convertUnits(100, 'kg', 'kg')).toBe(100)
        expect(convertUnits(0.001, 'kg', 'kg')).toBe(0.001)
      })
    })

    describe('Gram Conversions', () => {
      it('should convert g to kg', () => {
        expect(convertUnits(1000, 'g', 'kg')).toBe(1)
        expect(convertUnits(500, 'g', 'kg')).toBe(0.5)
        expect(convertUnits(2500, 'g', 'kg')).toBe(2.5)
      })

      it('should convert g to lb', () => {
        expect(convertUnits(1000, 'g', 'lb')).toBeCloseTo(2.20462, 4)
        expect(convertUnits(500, 'g', 'lb')).toBeCloseTo(1.10231, 4)
      })

      it('should convert g to oz', () => {
        expect(convertUnits(100, 'g', 'oz')).toBeCloseTo(3.5274, 3)
        expect(convertUnits(28.3495, 'g', 'oz')).toBeCloseTo(1, 4)
      })

      it('should keep g to g unchanged', () => {
        expect(convertUnits(250, 'g', 'g')).toBe(250)
      })
    })

    describe('Pound Conversions', () => {
      it('should convert lb to kg', () => {
        expect(convertUnits(1, 'lb', 'kg')).toBeCloseTo(0.453592, 5)
        expect(convertUnits(10, 'lb', 'kg')).toBeCloseTo(4.53592, 4)
        expect(convertUnits(100, 'lb', 'kg')).toBeCloseTo(45.3592, 3)
      })

      it('should convert lb to g', () => {
        expect(convertUnits(1, 'lb', 'g')).toBeCloseTo(453.592, 2)
        expect(convertUnits(2, 'lb', 'g')).toBeCloseTo(907.184, 2)
      })

      it('should convert lb to oz', () => {
        expect(convertUnits(1, 'lb', 'oz')).toBe(16)
        expect(convertUnits(2.5, 'lb', 'oz')).toBe(40)
      })
    })

    describe('Ounce Conversions', () => {
      it('should convert oz to kg', () => {
        expect(convertUnits(1, 'oz', 'kg')).toBeCloseTo(0.0283495, 6)
        expect(convertUnits(16, 'oz', 'kg')).toBeCloseTo(0.453592, 5)
      })

      it('should convert oz to g', () => {
        expect(convertUnits(1, 'oz', 'g')).toBeCloseTo(28.3495, 4)
        expect(convertUnits(10, 'oz', 'g')).toBeCloseTo(283.495, 3)
      })

      it('should convert oz to lb', () => {
        expect(convertUnits(16, 'oz', 'lb')).toBe(1)
        expect(convertUnits(32, 'oz', 'lb')).toBe(2)
        expect(convertUnits(8, 'oz', 'lb')).toBe(0.5)
      })
    })
  })

  describe('Volume Conversions', () => {
    describe('Liter Conversions', () => {
      it('should convert L to ml', () => {
        expect(convertUnits(1, 'L', 'ml')).toBe(1000)
        expect(convertUnits(2.5, 'L', 'ml')).toBe(2500)
        expect(convertUnits(0.75, 'L', 'ml')).toBe(750)
      })

      it('should convert L to gal', () => {
        expect(convertUnits(1, 'L', 'gal')).toBeCloseTo(0.264172, 5)
        expect(convertUnits(10, 'L', 'gal')).toBeCloseTo(2.64172, 4)
        expect(convertUnits(100, 'L', 'gal')).toBeCloseTo(26.4172, 3)
      })

      it('should convert L to fl_oz', () => {
        expect(convertUnits(1, 'L', 'fl_oz')).toBeCloseTo(33.814, 3)
        expect(convertUnits(0.5, 'L', 'fl_oz')).toBeCloseTo(16.907, 3)
      })

      it('should keep L to L unchanged', () => {
        expect(convertUnits(5, 'L', 'L')).toBe(5)
      })
    })

    describe('Milliliter Conversions', () => {
      it('should convert ml to L', () => {
        expect(convertUnits(1000, 'ml', 'L')).toBe(1)
        expect(convertUnits(500, 'ml', 'L')).toBe(0.5)
        expect(convertUnits(250, 'ml', 'L')).toBe(0.25)
      })

      it('should convert ml to gal', () => {
        expect(convertUnits(1000, 'ml', 'gal')).toBeCloseTo(0.264172, 5)
        expect(convertUnits(3785.41, 'ml', 'gal')).toBeCloseTo(1, 2)
      })

      it('should convert ml to fl_oz', () => {
        expect(convertUnits(1000, 'ml', 'fl_oz')).toBeCloseTo(33.814, 3)
        expect(convertUnits(500, 'ml', 'fl_oz')).toBeCloseTo(16.907, 3)
      })

      it('should keep ml to ml unchanged', () => {
        expect(convertUnits(750, 'ml', 'ml')).toBe(750)
      })
    })
  })

  describe('Conversion Precision', () => {
    it('should maintain precision for small values', () => {
      const result = convertUnits(0.001, 'kg', 'g')
      expect(result).toBeCloseTo(1, 10)
    })

    it('should maintain precision for large values', () => {
      const result = convertUnits(10000, 'kg', 'lb')
      expect(result).toBeCloseTo(22046.2, 1)
    })

    it('should handle decimal precision correctly', () => {
      const result = convertUnits(1.23456, 'kg', 'g')
      expect(result).toBeCloseTo(1234.56, 2)
    })
  })

  describe('Round-trip Conversions', () => {
    it('should preserve value in kg->g->kg conversion', () => {
      const original = 100
      const inGrams = convertUnits(original, 'kg', 'g')
      const backToKg = convertUnits(inGrams, 'g', 'kg')
      expect(backToKg).toBeCloseTo(original, 10)
    })

    it('should preserve value in kg->lb->kg conversion', () => {
      const original = 50
      const inPounds = convertUnits(original, 'kg', 'lb')
      const backToKg = convertUnits(inPounds, 'lb', 'kg')
      expect(backToKg).toBeCloseTo(original, 5)
    })

    it('should preserve value in L->ml->L conversion', () => {
      const original = 5
      const inMl = convertUnits(original, 'L', 'ml')
      const backToL = convertUnits(inMl, 'ml', 'L')
      expect(backToL).toBeCloseTo(original, 10)
    })

    it('should preserve value in L->gal->L conversion', () => {
      const original = 10
      const inGallons = convertUnits(original, 'L', 'gal')
      const backToL = convertUnits(inGallons, 'gal', 'L')
      expect(backToL).toBeCloseTo(original, 4)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for unknown source unit', () => {
      expect(() => convertUnits(1, 'unknown', 'kg')).toThrow('Unknown unit: unknown')
    })

    it('should throw error for unknown target unit', () => {
      expect(() => convertUnits(1, 'kg', 'unknown')).toThrow('Cannot convert kg to unknown')
    })

    it('should throw error for incompatible conversion (mass to volume)', () => {
      expect(() => convertUnits(1, 'kg', 'L')).toThrow('Cannot convert kg to L')
    })

    it('should throw error for incompatible conversion (volume to mass)', () => {
      expect(() => convertUnits(1, 'L', 'kg')).toThrow('Cannot convert L to kg')
    })
  })

  describe('Real-world Production Scenarios', () => {
    it('should convert recipe from kg to lb for US production', () => {
      const recipeIngredientKg = 85.5
      const recipeIngredientLb = convertUnits(recipeIngredientKg, 'kg', 'lb')
      expect(recipeIngredientLb).toBeCloseTo(188.49, 2)
    })

    it('should convert batch size from L to gal for US tank', () => {
      const batchSizeL = 10000
      const batchSizeGal = convertUnits(batchSizeL, 'L', 'gal')
      expect(batchSizeGal).toBeCloseTo(2641.72, 2)
    })

    it('should convert small ingredient quantities accurately', () => {
      const vitaminCGrams = 0.7
      const vitaminCOunces = convertUnits(vitaminCGrams, 'g', 'oz')
      expect(vitaminCOunces).toBeCloseTo(0.0247, 4)
    })

    it('should scale and convert for industrial production', () => {
      const pilotBatchKg = 5
      const industrialScaleFactor = 2000
      const industrialBatchKg = pilotBatchKg * industrialScaleFactor
      const industrialBatchLb = convertUnits(industrialBatchKg, 'kg', 'lb')
      
      expect(industrialBatchKg).toBe(10000)
      expect(industrialBatchLb).toBeCloseTo(22046.2, 1)
    })
  })

  describe('UoM Conversion Snapshot Tests', () => {
    it('should match snapshot for common production conversions', () => {
      const conversions = {
        '100kg_to_g': convertUnits(100, 'kg', 'g'),
        '100kg_to_lb': convertUnits(100, 'kg', 'lb'),
        '1000L_to_ml': convertUnits(1000, 'L', 'ml'),
        '1000L_to_gal': convertUnits(1000, 'L', 'gal'),
        '5lb_to_kg': convertUnits(5, 'lb', 'kg'),
        '500ml_to_L': convertUnits(500, 'ml', 'L')
      }

      expect(conversions).toMatchSnapshot()
    })

    it('should match snapshot for recipe scaling conversions', () => {
      const recipe = {
        water_kg: 85.5,
        sugar_kg: 12.3,
        citric_kg: 1.5,
        vitamin_kg: 0.7
      }

      const recipeInPounds = {
        water_lb: convertUnits(recipe.water_kg, 'kg', 'lb'),
        sugar_lb: convertUnits(recipe.sugar_kg, 'kg', 'lb'),
        citric_lb: convertUnits(recipe.citric_kg, 'kg', 'lb'),
        vitamin_lb: convertUnits(recipe.vitamin_kg, 'kg', 'lb')
      }

      expect(recipeInPounds).toMatchSnapshot()
    })
  })
})
