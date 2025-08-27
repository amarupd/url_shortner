
import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true, index: true },
  shortCode: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  clickCount: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null, index: true },
}, { timestamps: true });

// Avoid duplicates per-user (including anonymous grouping with null)
urlSchema.index({ originalUrl: 1, user: 1 }, { unique: true, partialFilterExpression: { originalUrl: { $exists: true } } });

export default mongoose.model('Url', urlSchema);
