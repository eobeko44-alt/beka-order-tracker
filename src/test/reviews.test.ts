import { describe, expect, it } from 'vitest';
import { describeReviewError, validateReview, validateReviewerName } from '@/lib/reviews';

describe('review rules', () => {
  it('accepts ratings 1 to 5 only', () => {
    expect(validateReview(1, 'ممتاز')).toBeNull();
    expect(validateReview(5, 'ممتاز')).toBeNull();
    expect(validateReview(0, 'ممتاز')).not.toBeNull();
    expect(validateReview(6, 'ممتاز')).not.toBeNull();
    expect(validateReview(3.5, 'ممتاز')).not.toBeNull();
  });

  it('requires a comment between 3 and 400 characters', () => {
    expect(validateReview(5, '  ok ')).not.toBeNull();
    expect(validateReview(5, 'جيد')).toBeNull();
    expect(validateReview(5, 'ا'.repeat(400))).toBeNull();
    expect(validateReview(5, 'ا'.repeat(401))).not.toBeNull();
  });

  it('requires a reviewer name of 2 to 40 characters', () => {
    expect(validateReviewerName('م')).not.toBeNull();
    expect(validateReviewerName('محمد')).toBeNull();
    expect(validateReviewerName('ا'.repeat(41))).not.toBeNull();
  });

  it('explains that an order can only be reviewed once', () => {
    expect(describeReviewError(new Error('ALREADY_REVIEWED'))).toBe('قيّمت الطلب ده قبل كده، شكراً ليك!');
  });
});
