import React from "react";
import { connect } from "alt-react";
import classNames from "classnames";
import AccountActions from "actions/AccountActions";
import AccountStore from "stores/AccountStore";
import AccountNameInput from "./../Forms/AccountNameInput";
import WalletDb from "stores/WalletDb";
import notify from "actions/NotificationActions";
import {Link} from "react-router/es";
import AccountSelect from "../Forms/AccountSelect";
import TransactionConfirmStore from "stores/TransactionConfirmStore";
import LoadingIndicator from "../LoadingIndicator";
import Translate from "react-translate-component";
import counterpart from "counterpart";
import {ChainStore, FetchChain, key} from "agorise-bitsharesjs/es";
import ReactTooltip from "react-tooltip";
import utils from "common/utils";
import SettingsActions from "actions/SettingsActions";
import WalletUnlockActions from "actions/WalletUnlockActions";

class CreateAccountPassword extends React.Component {
    constructor() {
        super();
        this.state = {
            validAccountName: false,
            accountName: "",
            validPassword: false,
            registrar_account: null,
            loading: false,
            hide_refcode: true,
            show_identicon: false,
            step: 1,
            showPass: false,
            generatedPassword: "P" + key.get_random_key().toWif(),
            confirm_password: "",
            understand_1: false,
            understand_2: false
        };
        this.onFinishConfirm = this.onFinishConfirm.bind(this);

        this.accountNameInput = null;
    }

    componentWillMount() {
        SettingsActions.changeSetting({
            setting: "passwordLogin",
            value: true
        });
    }

    componentDidMount() {
        ReactTooltip.rebuild();
    }

    shouldComponentUpdate(nextProps, nextState) {
        return !utils.are_equal_shallow(nextState, this.state);
    }

    isValid() {
        let firstAccount = AccountStore.getMyAccounts().length === 0;
        let valid = this.state.validAccountName;
        if (!WalletDb.getWallet()) {
            valid = valid && this.state.validPassword;
        }
        if (!firstAccount) {
            valid = valid && this.state.registrar_account;
        }
        return valid && this.state.understand_1 && this.state.understand_2;
    }

    onAccountNameChange(e) {
        const state = {};
        if(e.valid !== undefined) state.validAccountName = e.valid;
        if(e.value !== undefined) state.accountName = e.value;
        if (!this.state.show_identicon) state.show_identicon = true;
        this.setState(state);
    }

    onFinishConfirm(confirm_store_state) {
        if(confirm_store_state.included && confirm_store_state.broadcasted_transaction) {
            TransactionConfirmStore.unlisten(this.onFinishConfirm);
            TransactionConfirmStore.reset();

            FetchChain("getAccount", this.state.accountName).then(() => {
                console.log("onFinishConfirm");
                this.props.router.push("/wallet/backup/create?newAccount=true");
            });
        }
    }

    _unlockAccount(name, password) {
        WalletDb.validatePassword(password, true, name);
        WalletUnlockActions.checkLock.defer();
    }

    createAccount(name, password) {
        let refcode = this.refs.refcode ? this.refs.refcode.value() : null;
        let referralAccount = AccountStore.getState().referralAccount;
        this.setState({loading: true});

        AccountActions.createAccountWithPassword(name, password, this.state.registrar_account, referralAccount || this.state.registrar_account, 0, refcode).then(() => {
            AccountActions.setPasswordAccount(name);
            // User registering his own account
            if(this.state.registrar_account) {
                FetchChain("getAccount", name).then(() => {
                    this.setState({
                        step: 2,
                        loading: false
                    });
                    this._unlockAccount(name, password);
                });
                TransactionConfirmStore.listen(this.onFinishConfirm);
            } else { // Account registered by the faucet
                // this.props.router.push(`/wallet/backup/create?newAccount=true`);
                FetchChain("getAccount", name).then(() => {
                    this.setState({
                        step: 2
                    });
                });
                this._unlockAccount(name, password);
                // this.props.router.push(`/account/${name}/overview`);

            }
        }).catch(error => {
            console.log("ERROR AccountActions.createAccount", error);
            let error_msg = error.base && error.base.length && error.base.length > 0 ? error.base[0] : "unknown error";
            if (error.remote_ip) error_msg = error.remote_ip[0];
            notify.addNotification({
                message: `Failed to create account: ${name} - ${error_msg}`,
                level: "error",
                autoDismiss: 10
            });
            this.setState({loading: false});
        });
    }

    onSubmit(e) {
        e.preventDefault();
        if (!this.isValid()) return;
        let account_name = this.accountNameInput.getValue();
        // if (WalletDb.getWallet()) {
        //     this.createAccount(account_name);
        // } else {
        let password = this.state.generatedPassword;
        this.createAccount(account_name, password);
    }

    onRegistrarAccountChange(registrar_account) {
        this.setState({registrar_account});
    }

    // showRefcodeInput(e) {
    //     e.preventDefault();
    //     this.setState({hide_refcode: false});
    // }

    _onInput(value, e) {
        this.setState({
            [value]: value === "confirm_password" ? e.target.value : !this.state[value],
            validPassword: value === "confirm_password" ? e.target.value === this.state.generatedPassword : this.state.validPassword
        });
    }

    _renderAccountCreateForm() {

        let {registrar_account} = this.state;

        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = my_accounts.length === 0;
        let hasWallet = WalletDb.getWallet();
        let valid = this.isValid();
        let isLTM = false;
        let registrar = registrar_account ? ChainStore.getAccount(registrar_account) : null;
        if (registrar) {
            if( registrar.get( "lifetime_referrer" ) == registrar.get( "id" ) ) {
                isLTM = true;
            }
        }
        let buttonClass = classNames("submit-button button no-margin", {disabled: (!valid || (registrar_account && !isLTM))});

        return (
            <div>

                <form
                    style={{maxWidth: "60rem"}}
                    onSubmit={this.onSubmit.bind(this)}
                    noValidate
                >
                    <p style={{fontWeight: "bold"}}><Translate content="wallet.create_password" /></p>
                    <AccountNameInput
                        ref={(ref) => {if (ref) {this.accountNameInput = ref.refs.nameInput;}}}
                        cheapNameOnly={!!firstAccount}
                        onChange={this.onAccountNameChange.bind(this)}
                        accountShouldNotExist={true}
                        placeholder={counterpart.translate("wallet.account_public")}
                        noLabel
                    />

                <section>
                    <label className="left-label"><Translate content="wallet.generated" /></label>
                    <div style={{padding: "0.25rem"}}>
                        <p>{this.state.generatedPassword}</p>
                    </div>
                </section>

                <section>
                    <label className="left-label"><Translate content="wallet.confirm_password" /></label>
                    <input type="password" value={this.state.confirm_password} onChange={this._onInput.bind(this, "confirm_password")}/>
                    {this.state.confirm_password && this.state.confirm_password !== this.state.generatedPassword ?
                    <div className="has-error"><Translate content="wallet.confirm_error" /></div> : null}
            </section>

                <br />
                <div onClick={this._onInput.bind(this, "understand_1")}>
                    <input type="checkbox" onChange={() => {}} checked={this.state.understand_1}/>
                    <label><Translate content="wallet.understand_1" /></label>
                </div>
                <br />

                <div onClick={this._onInput.bind(this, "understand_2")}>
                    <input type="checkbox" onChange={() => {}} checked={this.state.understand_2}/>
                    <label><Translate content="wallet.understand_2" /></label>
                </div>
                    {/* If this is not the first account, show dropdown for fee payment account */}
                    {
                    firstAccount ? null : (
                        <div className="full-width-content form-group no-overflow" style={{paddingTop: 30}}>
                            <label><Translate content="account.pay_from" /></label>
                            <AccountSelect
                                account_names={my_accounts}
                                onChange={this.onRegistrarAccountChange.bind(this)}
                            />
                            {(registrar_account && !isLTM) ? <div style={{textAlign: "left"}} className="facolor-error"><Translate content="wallet.must_be_ltm" /></div> : null}
                        </div>)
                    }

                    <div className="divider" />

                    {/* Submit button */}
                    {this.state.loading ?  <LoadingIndicator type="three-bounce"/> : <button className={buttonClass}><Translate content="account.create_account" /></button>}

                    {/* Backup restore option */}
                    {/* <div style={{paddingTop: 40}}>
                        <label>
                            <Link to="/existing-account">
                                <Translate content="wallet.restore" />
                            </Link>
                        </label>

                        <label>
                            <Link to="/create-wallet-brainkey">
                                <Translate content="settings.backup_brainkey" />
                            </Link>
                        </label>
                    </div> */}

                    {/* Skip to step 3 */}
                    {/* {(!hasWallet || firstAccount ) ? null :<div style={{paddingTop: 20}}>
                        <label>
                            <a onClick={() => {this.setState({step: 3});}}><Translate content="wallet.go_get_started" /></a>
                        </label>
                    </div>} */}
                </form>
                <br />
                <p>
                    <Translate content="wallet.bts_rules" unsafe />
                </p>
            </div>
        );
    }

    _renderAccountCreateText() {
        let my_accounts = AccountStore.getMyAccounts();
        let firstAccount = my_accounts.length === 0;

        return (
            <div>
                <h4 style={{fontWeight: "bold", paddingBottom: 15}}><Translate content="wallet.wallet_password" /></h4>

                <Translate style={{textAlign: "left"}} unsafe component="p" content="wallet.create_account_password_text" />

                <Translate style={{textAlign: "left"}} component="p" content="wallet.create_account_text" />

                {firstAccount ?
                    null :
                    <Translate style={{textAlign: "left"}} component="p" content="wallet.not_first_account" />}
            </div>
        );
    }

    _renderBackup() {
        return (
            <div className="backup-submit">
                <p><Translate unsafe content="wallet.password_crucial" /></p>

                <div>

                    {!this.state.showPass ? <div onClick={() => {this.setState({showPass: true});}} className="button"><Translate content="wallet.password_show" /></div> : <div><h5><Translate content="settings.password" />:</h5><div style={{fontWeight: "bold", wordWrap: "break-word"}} className="no-overflow">{this.state.generatedPassword}</div></div>}
                </div>
                <div className="divider" />
                <div onClick={() => {this.setState({step: 3});}} className="button"><Translate content="init_error.understand" /></div>
            </div>
        );
    }

    _onBackupDownload = () => {
        this.setState({
            step: 3
        });
    }

    _renderBackupText() {
        return (
            <div>
                <p style={{fontWeight: "bold"}}><Translate content="footer.backup" /></p>
                <p className="txtlabel warning"><Translate unsafe content="wallet.password_lose_warning" /></p>
            </div>
        );
    }

    _renderGetStarted() {

        return (
            <div>
                <table className="table">
                    <tbody>

                        <tr>
                            <td><Translate content="wallet.tips_dashboard" />:</td>
                            <td><Link to="/dashboard"><Translate content="header.dashboard" /></Link></td>
                        </tr>

                        <tr>
                            <td><Translate content="wallet.tips_account" />:</td>
                            <td><Link to={`/account/${this.state.accountName}/overview`} ><Translate content="wallet.link_account" /></Link></td>
                        </tr>

                        <tr>
                            <td><Translate content="wallet.tips_deposit" />:</td>
                            <td><Link to="/deposit-withdraw"><Translate content="wallet.link_deposit" /></Link></td>
                        </tr>



                        <tr>
                            <td><Translate content="wallet.tips_transfer" />:</td>
                            <td><Link to="/transfer"><Translate content="wallet.link_transfer" /></Link></td>
                        </tr>

                        <tr>
                            <td><Translate content="wallet.tips_settings" />:</td>
                            <td><Link to="/settings"><Translate content="header.settings" /></Link></td>
                        </tr>
                    </tbody>

                </table>
            </div>
        );
    }

    _renderGetStartedText() {

        return (
            <div>
                <p style={{fontWeight: "bold"}}><Translate content="wallet.congrat" /></p>

                <p><Translate content="wallet.tips_explore_pass" /></p>

                <p><Translate content="wallet.tips_header" /></p>

                <p className="txtlabel warning"><Translate content="wallet.tips_login" /></p>
            </div>
        );
    }

    render() {
        let {step} = this.state;
        // let my_accounts = AccountStore.getMyAccounts();
        // let firstAccount = my_accounts.length === 0;
        return (
            <div className="grid-block vertical page-layout Account_create">
                <div className="grid-block shrink small-12 medium-10 medium-offset-1">
                    <div className="grid-content" style={{paddingTop: 20}}>
                        <Translate content="wallet.wallet_new" component="h2" />
                        {/* <h4 style={{paddingTop: 20}}>
                            {step === 1 ?
                                <span>{firstAccount ? <Translate content="wallet.create_w_a" />  : <Translate content="wallet.create_a" />}</span> :
                            step === 2 ? <Translate content="wallet.create_success" /> :
                            <Translate content="wallet.all_set" />
                            }
                        </h4> */}
                    </div>
                </div>
                <div className="grid-block wrap">
                    <div className="grid-content small-12 large-6 large-offset-1">
                        {step !== 1 ? <p style={{fontWeight: "bold"}}>
                            <Translate content={"wallet.step_" + step} />
                        </p> : null}

                        {step === 1 ? (<div>{this._renderAccountCreateText()}
                    <br />{this._renderAccountCreateForm()}</div>) : step === 2 ? this._renderBackup() :
                            this._renderGetStarted()
                        }
                    </div>

                    <div className="grid-content small-12 large-5">
                        {step === 1 ? null : step === 2 ? this._renderBackupText() :
                            this._renderGetStartedText()
                        }
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(CreateAccountPassword, {
    listenTo() {
        return [AccountStore];
    },
    getProps() {
        return {};
    }
});
