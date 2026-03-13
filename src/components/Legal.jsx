import React from 'react'

export function CGU({ onClose }) {
  return (
    <LegalPage title="Conditions Générales d'Utilisation" onClose={onClose}>
      <h3>1. Objet</h3>
      <p>Les présentes CGU régissent l'utilisation de Stage Stock, application de gestion de stock (WMS) destinée aux artistes et professionnels du spectacle, éditée par EK SHOP.</p>

      <h3>2. Accès au service</h3>
      <p>L'accès à Stage Stock nécessite la création d'un compte utilisateur avec une adresse email valide et un mot de passe. L'utilisateur est responsable de la confidentialité de ses identifiants.</p>

      <h3>3. Utilisation du service</h3>
      <p>L'utilisateur s'engage à utiliser le service conformément à sa destination : gestion de stock, d'événements et d'équipe dans le cadre d'activités artistiques et de spectacle.</p>
      <p>Il est interdit d'utiliser le service à des fins illégales, de tenter d'accéder aux données d'autres organisations, ou de perturber le fonctionnement du service.</p>

      <h3>4. Données et propriété</h3>
      <p>Les données saisies par l'utilisateur (produits, stocks, événements, etc.) restent sa propriété. EK SHOP s'engage à ne pas utiliser ces données à des fins commerciales tierces.</p>
      <p>L'utilisateur peut demander l'export ou la suppression de ses données à tout moment.</p>

      <h3>5. Responsabilité</h3>
      <p>Stage Stock est fourni "en l'état". EK SHOP ne garantit pas l'absence d'interruptions ou d'erreurs. L'utilisateur est responsable de la vérification de ses données de stock et de la sauvegarde de ses informations critiques.</p>

      <h3>6. Tarification</h3>
      <p>L'accès de base à Stage Stock est gratuit. Des fonctionnalités premium pourront être proposées sous forme d'abonnement mensuel. Tout changement de tarification sera communiqué avec un préavis de 30 jours.</p>

      <h3>7. Résiliation</h3>
      <p>L'utilisateur peut supprimer son compte à tout moment. EK SHOP se réserve le droit de suspendre un compte en cas de violation des présentes CGU.</p>

      <h3>8. Modification des CGU</h3>
      <p>EK SHOP peut modifier les présentes CGU. Les utilisateurs seront informés des modifications significatives. L'utilisation continue du service vaut acceptation des nouvelles conditions.</p>

      <h3>9. Droit applicable</h3>
      <p>Les présentes CGU sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Fort-de-France, Martinique.</p>

      <p style={{ marginTop: 24, fontSize: 11, color: '#B8A0AE' }}>Dernière mise à jour : mars 2026</p>
    </LegalPage>
  )
}

export function Privacy({ onClose }) {
  return (
    <LegalPage title="Politique de Confidentialité" onClose={onClose}>
      <h3>1. Responsable du traitement</h3>
      <p>EK SHOP, éditeur de Stage Stock, est responsable du traitement des données personnelles collectées via l'application.</p>

      <h3>2. Données collectées</h3>
      <p>Nous collectons les données suivantes :</p>
      <ul>
        <li><strong>Compte utilisateur :</strong> adresse email, mot de passe (hashé), nom d'affichage</li>
        <li><strong>Données métier :</strong> produits, stocks, mouvements, événements, checklists (saisies par l'utilisateur)</li>
        <li><strong>Données techniques :</strong> logs de connexion, type d'appareil (pour le bon fonctionnement de la PWA)</li>
      </ul>

      <h3>3. Finalité du traitement</h3>
      <p>Les données sont utilisées exclusivement pour :</p>
      <ul>
        <li>Fournir et améliorer le service Stage Stock</li>
        <li>Gérer l'authentification et la sécurité des comptes</li>
        <li>Communiquer des informations relatives au service</li>
      </ul>

      <h3>4. Hébergement et sécurité</h3>
      <p>Les données sont hébergées par Supabase (infrastructure cloud conforme RGPD). Les communications sont chiffrées (HTTPS/TLS). L'accès aux données est isolé par organisation (Row Level Security).</p>

      <h3>5. Partage des données</h3>
      <p>Nous ne vendons, ne louons et ne partageons pas les données personnelles avec des tiers, sauf obligation légale.</p>

      <h3>6. Durée de conservation</h3>
      <p>Les données sont conservées tant que le compte utilisateur est actif. En cas de suppression de compte, les données sont effacées dans un délai de 30 jours.</p>

      <h3>7. Droits des utilisateurs (RGPD)</h3>
      <p>Conformément au RGPD, vous disposez des droits suivants :</p>
      <ul>
        <li>Droit d'accès à vos données</li>
        <li>Droit de rectification</li>
        <li>Droit à l'effacement ("droit à l'oubli")</li>
        <li>Droit à la portabilité</li>
        <li>Droit d'opposition</li>
      </ul>
      <p>Pour exercer ces droits, contactez-nous par email.</p>

      <h3>8. Cookies</h3>
      <p>Stage Stock utilise uniquement le stockage local (localStorage) pour maintenir la session utilisateur et les préférences de modules. Aucun cookie tiers ou de tracking n'est utilisé.</p>

      <p style={{ marginTop: 24, fontSize: 11, color: '#B8A0AE' }}>Dernière mise à jour : mars 2026</p>
    </LegalPage>
  )
}

function LegalPage({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(180deg, #FFF8F0 0%, #FEF0E8 30%, #F8F0FA 70%, #F0F4FD 100%)',
      overflowY: 'auto',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,248,240,0.95)', backdropFilter: 'blur(12px)',
        padding: '12px 16px', borderBottom: '1px solid #F0E8E4',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onClose} style={{
          width: 36, height: 36, borderRadius: 10, background: '#F0E8E4',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, cursor: 'pointer', border: 'none',
        }}>←</button>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#3D3042' }}>{title}</div>
      </div>
      <div style={{
        padding: '20px 20px 60px', maxWidth: 600, margin: '0 auto',
        fontSize: 13, color: '#3D3042', lineHeight: 1.7,
      }}>
        {children}
      </div>
      <style>{`
        .legal-page h3 { font-size: 14px; font-weight: 800; color: #E8735A; margin: 20px 0 8px; }
        .legal-page p { margin: 0 0 10px; }
        .legal-page ul { margin: 0 0 10px; padding-left: 20px; }
        .legal-page li { margin-bottom: 4px; }
      `}</style>
    </div>
  )
}
