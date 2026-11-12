# কোচিং প্রো — কোচিং ম্যানেজমেন্ট সিস্টেম

React + Vite (ওয়েব) · Capacitor (Android APK) · Supabase (ডেটাবেজ + লগইন) — সবকিছু ফ্রি টিয়ারে চলে।

**ফিচার:** ড্যাশবোর্ড · শিক্ষার্থী · ব্যাচ · শিক্ষক · উপস্থিতি · বেতন আদায় ও রসিদ · পরীক্ষা ও ফলাফল (গ্রেড/মেধা তালিকা) · নোটিশ · সেটিংস

## দ্রুত শুরু
`npm install` তারপর `npm run dev` → ব্রাউজারে http://localhost:5173 খুলুন।
`npm run build` করলে `dist/index.html` ডাবল-ক্লিক করেও খোলা যায় (ডেমো মোডে)।

## ১) চালানো (ডেমো মোড, কোনো সেটআপ ছাড়া)
```bash
npm install
npm run dev
```
Supabase কী না দিলে অ্যাপ ডেমো মোডে চলে (নমুনা ডেটা, ব্রাউজারে সংরক্ষিত)।

## ২) Supabase যুক্ত করা (লাইভ ডেটাবেজ)
1. https://supabase.com এ ফ্রি প্রজেক্ট খুলুন।
2. **SQL Editor** → `supabase-schema.sql` এর পুরো লেখা পেস্ট করে **Run**।
3. **Authentication → Providers → Email** এ গিয়ে ডেমোর জন্য "Confirm email" বন্ধ করে দিন (সহজে সাইন-আপ হবে)।
4. **Project Settings → API** থেকে URL ও anon key কপি করে `.env` ফাইল বানান (`.env.example` দেখুন)।
5. `npm run dev` — এবার লগইন স্ক্রিন আসবে। "নতুন কোচিং খুলুন" দিয়ে সাইন-আপ করুন; প্রতিটা সাইন-আপ নিজের আলাদা কোচিং ও আলাদা ডেটা পায় (RLS দিয়ে সুরক্ষিত)।

> anon key ব্রাউজারে থাকা স্বাভাবিক, নিরাপত্তা দেয় RLS পলিসি। `service_role` key কখনো অ্যাপে দেবেন না।

## ৩) ওয়েবসাইট ডিপ্লয় (Vercel, ফ্রি)
GitHub-এ পুশ করে Vercel-এ ইমপোর্ট করুন → Environment Variables-এ `VITE_SUPABASE_URL` ও `VITE_SUPABASE_ANON_KEY` দিন → Deploy।

## ৪) APK বানানো (ফ্রি, নিজের পিসিতে Android Studio ছাড়াই)
1. প্রজেক্ট GitHub রিপোজিটরিতে পুশ করুন।
2. Repo → **Settings → Secrets and variables → Actions** এ `VITE_SUPABASE_URL` ও `VITE_SUPABASE_ANON_KEY` যোগ করুন।
3. **Actions → Build Android APK → Run workflow**।
4. শেষ হলে রান পেজের **Artifacts** থেকে `coaching-pro-apk` ডাউনলোড করুন → `app-debug.apk` ফোনে ইনস্টল।

নিজের পিসিতে বানাতে চাইলে: `npm run build && npx cap add android && npx cap sync android && cd android && ./gradlew assembleDebug` (JDK 17 লাগবে)।

## ৫) কোচিংয়ের কাছে বিক্রির আগে
- নিজের নাম/লোগো: `public/icon.svg`, `capacitor.config.json` (appName), `src/store.js` (ডেমো ডেটা)
- প্লে স্টোরে দিতে চাইলে signed release APK/AAB দরকার (debug APK শুধু ডেমো/টেস্টের জন্য)
- ডেটা অ্যাক্সেস শুধু `src/db.js` দিয়ে হয় — ব্যাকএন্ড বদলাতে চাইলে শুধু ওই ফাইল বদলাতে হবে
