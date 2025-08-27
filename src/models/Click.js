
import mongoose from 'mongoose';

const clickSchema = new mongoose.Schema({
  url: { type: mongoose.Schema.Types.ObjectId, ref: 'Url', required: true, index: true },
  timestamp: { type: Date, default: Date.now, index: true },
  country: { type: String, default: 'Unknown', index: true },
  referrer: { type: String, default: 'Direct', index: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Click', clickSchema);
